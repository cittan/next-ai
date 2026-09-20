import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * 训练计划生成工具
 * 根据用户水平、目标和可用天数生成周训练计划
 */

interface WorkoutSplit {
    name: string;
    days: string[];
    description: string;
}

/** 训练分化模板 */
const SPLITS: Record<string, WorkoutSplit> = {
    '3day_full': {
        name: '全身训练 (3天/周)',
        days: ['周一: 全身A', '周三: 全身B', '周五: 全身C'],
        description: '适合新手，每次训练覆盖全身肌群，频率高但单次量不大',
    },
    '4day_upper_lower': {
        name: '上下肢分化 (4天/周)',
        days: ['周一: 上肢A', '周二: 下肢A', '周四: 上肢B', '周五: 下肢B'],
        description: '经典分化，每个肌群每周练 2 次，适合初级-中级',
    },
    '5day_bodypart': {
        name: '兄弟分化 (5天/周)',
        days: ['周一: 胸', '周二: 背', '周三: 腿', '周四: 肩', '周五: 手臂'],
        description: '每个肌群单独一天，单次训练量大，适合中级以上',
    },
    '6day_push_pull_legs': {
        name: '推拉腿 (6天/周)',
        days: ['周一: 推', '周二: 拉', '周三: 腿', '周四: 推', '周五: 拉', '周六: 腿'],
        description: 'PPL 分化，每个肌群每周练 2 次，适合中高级',
    },
};

/** 各分化对应的训练动作模板 */
const WORKOUT_TEMPLATES: Record<string, { exercise: string; sets: string; reps: string; rest: string }[]> = {
    '全身A': [
        { exercise: '杠铃深蹲', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '杠铃卧推', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '杠铃划船', sets: '3', reps: '10-12', rest: '75s' },
        { exercise: '哑铃推举', sets: '3', reps: '10-12', rest: '60s' },
        { exercise: '平板支撑', sets: '3', reps: '30-60s', rest: '45s' },
    ],
    '全身B': [
        { exercise: '罗马尼亚硬拉', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '引体向上/高位下拉', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '箭步蹲', sets: '3', reps: '10/侧', rest: '75s' },
        { exercise: '哑铃飞鸟', sets: '3', reps: '12-15', rest: '60s' },
        { exercise: '卷腹', sets: '3', reps: '15-20', rest: '45s' },
    ],
    '全身C': [
        { exercise: '腿举', sets: '4', reps: '10-12', rest: '90s' },
        { exercise: '俯卧撑/哑铃卧推', sets: '4', reps: '10-12', rest: '75s' },
        { exercise: '哑铃单臂划船', sets: '3', reps: '10-12/侧', rest: '75s' },
        { exercise: '侧平举', sets: '3', reps: '12-15', rest: '60s' },
        { exercise: '俄罗斯转体', sets: '3', reps: '15/侧', rest: '45s' },
    ],
    '上肢A': [
        { exercise: '杠铃卧推', sets: '4', reps: '6-8', rest: '120s' },
        { exercise: '杠铃划船', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '哑铃推举', sets: '3', reps: '10-12', rest: '75s' },
        { exercise: '哑铃弯举', sets: '3', reps: '12-15', rest: '60s' },
        { exercise: '绳索下压', sets: '3', reps: '12-15', rest: '60s' },
    ],
    '上肢B': [
        { exercise: '上斜哑铃卧推', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '引体向上', sets: '4', reps: '6-10', rest: '90s' },
        { exercise: '侧平举', sets: '4', reps: '12-15', rest: '60s' },
        { exercise: '哑铃飞鸟', sets: '3', reps: '12-15', rest: '60s' },
        { exercise: '锤式弯举', sets: '3', reps: '12-15', rest: '60s' },
    ],
    '下肢A': [
        { exercise: '杠铃深蹲', sets: '4', reps: '6-8', rest: '120s' },
        { exercise: '罗马尼亚硬拉', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '腿举', sets: '3', reps: '10-12', rest: '90s' },
        { exercise: '腿弯举', sets: '3', reps: '12-15', rest: '60s' },
        { exercise: '提踵', sets: '4', reps: '15-20', rest: '45s' },
    ],
    '下肢B': [
        { exercise: '箭步蹲', sets: '4', reps: '10/侧', rest: '90s' },
        { exercise: '臀推', sets: '4', reps: '10-12', rest: '90s' },
        { exercise: '腿屈伸', sets: '3', reps: '12-15', rest: '60s' },
        { exercise: '保加利亚分腿蹲', sets: '3', reps: '10/侧', rest: '75s' },
        { exercise: '平板支撑', sets: '3', reps: '45-60s', rest: '45s' },
    ],
    '胸': [
        { exercise: '杠铃卧推', sets: '4', reps: '6-8', rest: '120s' },
        { exercise: '上斜哑铃卧推', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '哑铃飞鸟', sets: '3', reps: '12-15', rest: '60s' },
        { exercise: '绳索夹胸', sets: '3', reps: '12-15', rest: '60s' },
        { exercise: '俯卧撑(力竭)', sets: '2', reps: '力竭', rest: '60s' },
    ],
    '背': [
        { exercise: '引体向上', sets: '4', reps: '6-10', rest: '90s' },
        { exercise: '杠铃划船', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '高位下拉', sets: '3', reps: '10-12', rest: '75s' },
        { exercise: '哑铃单臂划船', sets: '3', reps: '10-12/侧', rest: '75s' },
        { exercise: '面拉', sets: '3', reps: '15-20', rest: '45s' },
    ],
    '腿': [
        { exercise: '杠铃深蹲', sets: '5', reps: '5-8', rest: '120s' },
        { exercise: '罗马尼亚硬拉', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '腿举', sets: '4', reps: '10-12', rest: '90s' },
        { exercise: '腿弯举', sets: '3', reps: '12-15', rest: '60s' },
        { exercise: '提踵', sets: '4', reps: '15-20', rest: '45s' },
    ],
    '肩': [
        { exercise: '哑铃推举', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '侧平举', sets: '4', reps: '12-15', rest: '60s' },
        { exercise: '俯身飞鸟', sets: '3', reps: '12-15', rest: '60s' },
        { exercise: '面拉', sets: '3', reps: '15-20', rest: '45s' },
        { exercise: '哑铃耸肩', sets: '3', reps: '12-15', rest: '60s' },
    ],
    '手臂': [
        { exercise: '杠铃弯举', sets: '4', reps: '8-10', rest: '75s' },
        { exercise: '哑铃弯举', sets: '3', reps: '10-12', rest: '60s' },
        { exercise: '锤式弯举', sets: '3', reps: '10-12', rest: '60s' },
        { exercise: '绳索下压', sets: '4', reps: '10-12', rest: '75s' },
        { exercise: '过头臂屈伸', sets: '3', reps: '10-12', rest: '60s' },
    ],
    '推': [
        { exercise: '杠铃卧推', sets: '4', reps: '6-8', rest: '120s' },
        { exercise: '哑铃推举', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '上斜哑铃卧推', sets: '3', reps: '10-12', rest: '75s' },
        { exercise: '侧平举', sets: '4', reps: '12-15', rest: '60s' },
        { exercise: '绳索下压', sets: '3', reps: '12-15', rest: '60s' },
    ],
    '拉': [
        { exercise: '引体向上', sets: '4', reps: '6-10', rest: '90s' },
        { exercise: '杠铃划船', sets: '4', reps: '8-10', rest: '90s' },
        { exercise: '高位下拉', sets: '3', reps: '10-12', rest: '75s' },
        { exercise: '面拉', sets: '3', reps: '15-20', rest: '45s' },
        { exercise: '哑铃弯举', sets: '3', reps: '10-12', rest: '60s' },
    ],
};

/** 根据训练天数选择分化 */
function selectSplit(daysPerWeek: number): WorkoutSplit {
    if (daysPerWeek <= 3) return SPLITS['3day_full'];
    if (daysPerWeek === 4) return SPLITS['4day_upper_lower'];
    if (daysPerWeek === 5) return SPLITS['5day_bodypart'];
    return SPLITS['6day_push_pull_legs'];
}

export const workoutPlanTool = tool(
    async ({ fitnessLevel, goal, daysPerWeek, injuries }) => {
        const split = selectSplit(daysPerWeek);

        // 生成每日训练详情
        const dailyPlans = split.days.map((day) => {
            const dayName = day.split(': ')[1] || day;
            const template = WORKOUT_TEMPLATES[dayName];
            if (!template) return `${day}\n  (自定义训练内容)`;

            const exercises = template.map((e) =>
                `  - ${e.exercise}: ${e.sets}组 x ${e.reps}次, 休息${e.rest}`,
            ).join('\n');

            return `${day}\n${exercises}`;
        });

        // 根据目标添加建议
        const goalTips: Record<string, string[]> = {
            lose_fat: [
                '💡 减脂建议：',
                '  - 力量训练后加 20-30 分钟中低强度有氧',
                '  - 控制组间休息在 60-90 秒',
                '  - 每周可额外加 2-3 次 HIIT 或稳态有氧',
            ],
            gain_muscle: [
                '💡 增肌建议：',
                '  - 注重渐进超负荷，每 1-2 周尝试加重量或次数',
                '  - 组间休息 90-120 秒，保证训练质量',
                '  - 训练后 30 分钟内补充蛋白质 + 碳水',
            ],
            maintain: [
                '💡 维持建议：',
                '  - 保持当前训练强度，注重动作质量',
                '  - 可适当加入有氧和柔韧训练提升整体健康',
            ],
        };

        const tips = goalTips[goal] || goalTips['maintain'];

        // 伤病注意事项
        const injuryNotes = injuries
            ? [`⚠️ 伤病注意：${injuries}`, '  - 避开疼痛动作，用无痛替代动作', '  - 如有不适立即停止，必要时咨询医生']
            : [];

        return [
            `📋 训练计划 (${split.name})`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `水平: ${fitnessLevel} | 目标: ${goal === 'lose_fat' ? '减脂' : goal === 'gain_muscle' ? '增肌' : '维持'} | 训练天数: ${daysPerWeek}天/周`,
            ``,
            `📅 周计划：`,
            dailyPlans.join('\n\n'),
            ``,
            ...tips,
            ...(injuryNotes.length > 0 ? ['', ...injuryNotes] : []),
        ].join('\n');
    },
    {
        name: 'workout_plan_generator',
        description:
            '根据用户的健身水平、目标和每周可训练天数，生成完整的周训练计划。' +
            '包含每天的具体动作、组数、次数和休息时间。' +
            '支持 3-6 天/周的训练分化（全身/上下肢/兄弟分化/推拉腿）。' +
            '当用户说"帮我制定训练计划"、"我该练什么"、"给我一个周计划"时使用。',
        schema: z.object({
            fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced'])
                .describe('健身水平: beginner=新手(0-6个月), intermediate=中级(6个月-2年), advanced=高级(2年以上)'),
            goal: z.enum(['lose_fat', 'gain_muscle', 'maintain'])
                .describe('目标: lose_fat=减脂, gain_muscle=增肌, maintain=维持'),
            daysPerWeek: z.number().min(2).max(6).describe('每周可训练天数 (2-6)'),
            injuries: z.string().optional().describe('伤病史或需要注意的部位，如"膝盖不好"、"腰椎间盘突出"'),
        }),
    },
);
