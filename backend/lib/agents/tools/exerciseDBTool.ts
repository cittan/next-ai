import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * 运动数据库查询工具
 * 内置常见运动动作数据，支持按肌群/器械/难度筛选
 */

interface Exercise {
    name: string;
    category: string;        // 分类：力量/有氧/柔韧
    targetMuscles: string[]; // 目标肌群
    equipment: string;       // 器械：无/哑铃/杠铃/器械
    difficulty: string;      // 难度：初级/中级/高级
    caloriesPerHour: number; // 每小时消耗热量 (kcal)，基于 70kg 体重
    description: string;     // 动作要点
    aliases: string[];       // 别名
}

const EXERCISE_DB: Exercise[] = [
    // ===== 胸部 =====
    { name: '俯卧撑', category: '力量', targetMuscles: ['胸大肌', '三角肌前束', '肱三头肌'], equipment: '无', difficulty: '初级', caloriesPerHour: 280, description: '双手略宽于肩，身体保持一条直线，下降至胸部接近地面', aliases: ['push up'] },
    { name: '杠铃卧推', category: '力量', targetMuscles: ['胸大肌', '三角肌前束', '肱三头肌'], equipment: '杠铃', difficulty: '中级', caloriesPerHour: 240, description: '肩胛骨收紧下沉，杠铃下放至胸部中段，发力推起', aliases: ['bench press', '卧推'] },
    { name: '哑铃飞鸟', category: '力量', targetMuscles: ['胸大肌'], equipment: '哑铃', difficulty: '中级', caloriesPerHour: 220, description: '仰卧，双臂微屈向两侧展开，感受胸部拉伸后合拢', aliases: ['fly'] },
    { name: '上斜哑铃卧推', category: '力量', targetMuscles: ['胸大肌上束', '三角肌前束'], equipment: '哑铃', difficulty: '中级', caloriesPerHour: 240, description: '凳子调至 30-45 度，推起时注意力集中在上胸', aliases: ['incline press'] },

    // ===== 背部 =====
    { name: '引体向上', category: '力量', targetMuscles: ['背阔肌', '肱二头肌'], equipment: '单杠', difficulty: '中级', caloriesPerHour: 300, description: '正握略宽于肩，拉起至下巴过杠，控制下放', aliases: ['pull up'] },
    { name: '杠铃划船', category: '力量', targetMuscles: ['背阔肌', '斜方肌', '菱形肌'], equipment: '杠铃', difficulty: '中级', caloriesPerHour: 260, description: '俯身约 45 度，杠铃沿大腿拉向腹部，肩胛骨后缩', aliases: ['barbell row', '划船'] },
    { name: '哑铃单臂划船', category: '力量', targetMuscles: ['背阔肌', '斜方肌'], equipment: '哑铃', difficulty: '初级', caloriesPerHour: 240, description: '一手一膝撑凳，另一手持哑铃沿体侧拉起', aliases: ['single arm row'] },
    { name: '高位下拉', category: '力量', targetMuscles: ['背阔肌', '肱二头肌'], equipment: '器械', difficulty: '初级', caloriesPerHour: 220, description: '正握宽握，拉至锁骨位置，感受背阔肌收缩', aliases: ['lat pulldown'] },

    // ===== 腿部 =====
    { name: '深蹲', category: '力量', targetMuscles: ['股四头肌', '臀大肌', '腘绳肌'], equipment: '无', difficulty: '初级', caloriesPerHour: 320, description: '双脚与肩同宽，下蹲至大腿平行地面，膝盖不超过脚尖', aliases: ['squat', '徒手深蹲'] },
    { name: '杠铃深蹲', category: '力量', targetMuscles: ['股四头肌', '臀大肌', '腘绳肌'], equipment: '杠铃', difficulty: '中级', caloriesPerHour: 360, description: '杠铃置于斜方肌，核心收紧，蹲至大腿平行或更低', aliases: ['back squat'] },
    { name: '箭步蹲', category: '力量', targetMuscles: ['股四头肌', '臀大肌'], equipment: '无', difficulty: '初级', caloriesPerHour: 280, description: '前腿膝盖不超过脚尖，后腿膝盖接近地面', aliases: ['lunge'] },
    { name: '罗马尼亚硬拉', category: '力量', targetMuscles: ['腘绳肌', '臀大肌'], equipment: '哑铃', difficulty: '中级', caloriesPerHour: 260, description: '微屈膝，髋关节铰链，哑铃沿腿前侧下放至膝下', aliases: ['RDL'] },
    { name: '腿举', category: '力量', targetMuscles: ['股四头肌', '臀大肌'], equipment: '器械', difficulty: '初级', caloriesPerHour: 280, description: '双脚与肩同宽放在踏板上，下放至膝盖约 90 度后蹬起', aliases: ['leg press'] },

    // ===== 肩部 =====
    { name: '哑铃推举', category: '力量', targetMuscles: ['三角肌前束', '三角肌中束'], equipment: '哑铃', difficulty: '初级', caloriesPerHour: 220, description: '坐姿，哑铃举至耳侧，发力推起至手臂伸直', aliases: ['shoulder press', '推举'] },
    { name: '侧平举', category: '力量', targetMuscles: ['三角肌中束'], equipment: '哑铃', difficulty: '初级', caloriesPerHour: 180, description: '微屈肘，哑铃向两侧抬起至肩平，控制下放', aliases: ['lateral raise'] },

    // ===== 手臂 =====
    { name: '哑铃弯举', category: '力量', targetMuscles: ['肱二头肌'], equipment: '哑铃', difficulty: '初级', caloriesPerHour: 180, description: '大臂固定，仅前臂移动，顶峰收缩', aliases: ['curl', '二头弯举'] },
    { name: '绳索下压', category: '力量', targetMuscles: ['肱三头肌'], equipment: '器械', difficulty: '初级', caloriesPerHour: 170, description: '大臂固定，下压至手臂伸直，顶峰收缩', aliases: ['tricep pushdown'] },

    // ===== 核心 =====
    { name: '平板支撑', category: '力量', targetMuscles: ['腹横肌', '腹直肌'], equipment: '无', difficulty: '初级', caloriesPerHour: 150, description: '身体保持一条直线，不要塌腰或弓背', aliases: ['plank'] },
    { name: '卷腹', category: '力量', targetMuscles: ['腹直肌'], equipment: '无', difficulty: '初级', caloriesPerHour: 180, description: '下背贴地，卷起至肩胛骨离地，不要拉脖子', aliases: ['crunch'] },
    { name: '俄罗斯转体', category: '力量', targetMuscles: ['腹斜肌'], equipment: '无', difficulty: '初级', caloriesPerHour: 200, description: '坐姿，双脚离地，双手合十左右转体', aliases: ['russian twist'] },

    // ===== 有氧 =====
    { name: '跑步', category: '有氧', targetMuscles: ['全身'], equipment: '无', difficulty: '初级', caloriesPerHour: 500, description: '保持心率在最大心率的 60-80%，每次 30 分钟以上', aliases: ['慢跑', '跑步机'] },
    { name: '跳绳', category: '有氧', targetMuscles: ['小腿', '全身'], equipment: '跳绳', difficulty: '初级', caloriesPerHour: 600, description: '前脚掌着地，手腕发力，保持节奏', aliases: ['jump rope'] },
    { name: '游泳', category: '有氧', targetMuscles: ['全身'], equipment: '无', difficulty: '初级', caloriesPerHour: 450, description: '自由泳/蛙泳均可，保持连续游动', aliases: ['swimming'] },
    { name: '骑行', category: '有氧', targetMuscles: ['股四头肌', '臀大肌'], equipment: '器械', difficulty: '初级', caloriesPerHour: 400, description: '保持踏频 80-100rpm，心率控制在有氧区间', aliases: ['cycling', '动感单车'] },
    { name: '椭圆机', category: '有氧', targetMuscles: ['全身'], equipment: '器械', difficulty: '初级', caloriesPerHour: 380, description: '手脚配合，保持匀速，对膝盖冲击小', aliases: ['elliptical'] },
    { name: 'HIIT', category: '有氧', targetMuscles: ['全身'], equipment: '无', difficulty: '高级', caloriesPerHour: 550, description: '高强度间歇训练，如 30 秒全力 + 15 秒休息，循环 15-20 分钟', aliases: ['高强度间歇'] },

    // ===== 柔韧/恢复 =====
    { name: '瑜伽', category: '柔韧', targetMuscles: ['全身'], equipment: '无', difficulty: '初级', caloriesPerHour: 200, description: '配合呼吸进行拉伸和体式保持', aliases: ['yoga'] },
    { name: '泡沫轴放松', category: '柔韧', targetMuscles: ['全身'], equipment: '泡沫轴', difficulty: '初级', caloriesPerHour: 120, description: '在紧张肌群上缓慢滚动，每个部位 30-60 秒', aliases: ['foam roll', '滚轴'] },
];

/** 搜索运动 */
function searchExercise(query: string): Exercise[] {
    const q = query.toLowerCase().trim();
    return EXERCISE_DB.filter((e) => {
        if (e.name.toLowerCase().includes(q)) return true;
        if (e.category.includes(q)) return true;
        if (e.equipment.includes(q)) return true;
        if (e.targetMuscles.some((m) => m.includes(q))) return true;
        if (e.difficulty.includes(q)) return true;
        return e.aliases.some((a) => a.toLowerCase().includes(q));
    });
}

export const exerciseDBTool = tool(
    async ({ query, muscleGroup, equipment, difficulty }) => {
        let results: Exercise[] = [];

        // 优先按关键词搜索
        if (query) {
            results = searchExercise(query);
        } else {
            results = [...EXERCISE_DB];
        }

        // 按条件筛选
        if (muscleGroup) {
            results = results.filter((e) =>
                e.targetMuscles.some((m) => m.includes(muscleGroup)),
            );
        }
        if (equipment) {
            results = results.filter((e) => e.equipment === equipment);
        }
        if (difficulty) {
            results = results.filter((e) => e.difficulty === difficulty);
        }

        if (results.length === 0) {
            return '未找到符合条件的运动。当前支持的动作类别：力量（胸/背/腿/肩/手臂/核心）、有氧、柔韧。器械类型：无/哑铃/杠铃/器械/单杠/跳绳/泡沫轴。';
        }

        const formatted = results.slice(0, 10).map((e, i) => {
            return [
                `${i + 1}. 【${e.name}】(${e.difficulty})`,
                `   分类: ${e.category} | 器械: ${e.equipment}`,
                `   目标肌群: ${e.targetMuscles.join('、')}`,
                `   每小时消耗: ~${e.caloriesPerHour} kcal (70kg 体重参考)`,
                `   要点: ${e.description}`,
            ].join('\n');
        });

        return `🏋️ 运动查询结果（共 ${results.length} 个匹配）：\n\n${formatted.join('\n\n')}`;
    },
    {
        name: 'exercise_database',
        description:
            '查询运动动作数据库，包含力量训练（胸/背/腿/肩/手臂/核心）、有氧运动和柔韧训练。' +
            '每个动作包含目标肌群、所需器械、难度等级、每小时消耗热量和动作要点。' +
            '当用户询问某个动作怎么做、某个肌群有哪些动作、或某种器械能做什么训练时使用。' +
            '可以按关键词、肌群、器械或难度筛选。',
        schema: z.object({
            query: z.string().optional().describe('搜索关键词，如动作名称、肌群名称（如"胸"、"腿"、"有氧"）'),
            muscleGroup: z.string().optional().describe('目标肌群筛选，如"胸大肌"、"股四头肌"、"背阔肌"'),
            equipment: z.enum(['无', '哑铃', '杠铃', '器械', '单杠', '跳绳', '泡沫轴']).optional().describe('器械类型筛选'),
            difficulty: z.enum(['初级', '中级', '高级']).optional().describe('难度筛选'),
        }),
    },
);
