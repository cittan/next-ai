import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * 饮食计划生成工具
 * 根据用户的身体数据、目标和偏好生成每日饮食方案
 */

interface MealTemplate {
    name: string;
    options: { name: string; calories: number; protein: number; carbs: number; fat: number }[];
}

/** 各餐次的食物选项模板 */
const MEAL_TEMPLATES: Record<string, MealTemplate> = {
    breakfast: {
        name: '早餐',
        options: [
            { name: '燕麦粥 + 蛋白粉 + 蓝莓', calories: 400, protein: 35, carbs: 50, fat: 8 },
            { name: '全麦面包 + 鸡蛋 2 个 + 牛奶', calories: 450, protein: 28, carbs: 45, fat: 18 },
            { name: '希腊酸奶 + 坚果 + 香蕉', calories: 380, protein: 20, carbs: 40, fat: 15 },
            { name: '蛋白煎饼 + 蜂蜜', calories: 350, protein: 25, carbs: 45, fat: 6 },
        ],
    },
    lunch: {
        name: '午餐',
        options: [
            { name: '鸡胸肉 150g + 糙米饭 + 西兰花', calories: 550, protein: 45, carbs: 60, fat: 10 },
            { name: '牛肉 120g + 红薯 + 蔬菜沙拉', calories: 520, protein: 38, carbs: 55, fat: 15 },
            { name: '三文鱼 120g + 藜麦 + 芦笋', calories: 580, protein: 35, carbs: 45, fat: 22 },
            { name: '豆腐 + 杂粮饭 + 炒时蔬', calories: 480, protein: 25, carbs: 65, fat: 12 },
        ],
    },
    dinner: {
        name: '晚餐',
        options: [
            { name: '鱼肉 150g + 蔬菜 + 少量主食', calories: 420, protein: 35, carbs: 30, fat: 15 },
            { name: '虾仁 150g + 沙拉 + 全麦面包', calories: 380, protein: 32, carbs: 35, fat: 10 },
            { name: '鸡胸肉 120g + 大量蔬菜', calories: 350, protein: 30, carbs: 20, fat: 12 },
            { name: '瘦牛肉 100g + 蔬菜汤', calories: 320, protein: 28, carbs: 15, fat: 16 },
        ],
    },
    snack: {
        name: '加餐',
        options: [
            { name: '蛋白粉 1 勺 + 香蕉', calories: 200, protein: 25, carbs: 25, fat: 2 },
            { name: '坚果 30g + 酸奶', calories: 220, protein: 12, carbs: 15, fat: 14 },
            { name: '鸡蛋 2 个', calories: 140, protein: 12, carbs: 1, fat: 10 },
            { name: '牛奶 250ml + 燕麦饼干', calories: 180, protein: 10, carbs: 25, fat: 5 },
        ],
    },
};

/** 根据目标调整宏量素比例 */
function adjustMacros(
    targetCalories: number,
    goal: string,
): { proteinRatio: number; fatRatio: number; carbRatio: number } {
    switch (goal) {
        case 'lose_fat':
            return { proteinRatio: 0.35, fatRatio: 0.30, carbRatio: 0.35 };
        case 'gain_muscle':
            return { proteinRatio: 0.30, fatRatio: 0.25, carbRatio: 0.45 };
        default:
            return { proteinRatio: 0.25, fatRatio: 0.25, carbRatio: 0.50 };
    }
}

/** 根据偏好筛选食物 */
function filterByPreference(
    options: { name: string; calories: number; protein: number; carbs: number; fat: number }[],
    preference: string,
): { name: string; calories: number; protein: number; carbs: number; fat: number } {
    if (preference === 'low_carb') {
        // 选碳水最低的
        return options.reduce((min, o) => (o.carbs < min.carbs ? o : min));
    }
    if (preference === 'high_protein') {
        // 选蛋白质最高的
        return options.reduce((max, o) => (o.protein > max.protein ? o : max));
    }
    // 默认选第一个
    return options[0];
}

export const mealPlanTool = tool(
    async ({ targetCalories, goal, mealsPerDay, preference, dietaryRestrictions }) => {
        const macros = adjustMacros(targetCalories, goal);

        // 计算每餐目标热量
        const mealDistribution = {
            breakfast: 0.25,
            lunch: 0.35,
            dinner: 0.30,
            snack: 0.10,
        };

        const mealCount = mealsPerDay || 3;
        const meals = [];

        // 生成各餐
        if (mealCount >= 3) {
            const breakfast = filterByPreference(MEAL_TEMPLATES.breakfast.options, preference || '');
            meals.push({ ...MEAL_TEMPLATES.breakfast, selected: breakfast });

            const lunch = filterByPreference(MEAL_TEMPLATES.lunch.options, preference || '');
            meals.push({ ...MEAL_TEMPLATES.lunch, selected: lunch });

            const dinner = filterByPreference(MEAL_TEMPLATES.dinner.options, preference || '');
            meals.push({ ...MEAL_TEMPLATES.dinner, selected: dinner });
        }

        if (mealCount >= 4) {
            const snack = filterByPreference(MEAL_TEMPLATES.snack.options, preference || '');
            meals.push({ ...MEAL_TEMPLATES.snack, selected: snack });
        }

        // 计算总营养
        const totals = meals.reduce(
            (acc, m) => ({
                calories: acc.calories + m.selected.calories,
                protein: acc.protein + m.selected.protein,
                carbs: acc.carbs + m.selected.carbs,
                fat: acc.fat + m.selected.fat,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
        );

        // 格式化输出
        const mealDetails = meals
            .map((m) => {
                return [
                    `🍽️ ${m.name}: ${m.selected.name}`,
                    `   热量: ${m.selected.calories} kcal | 蛋白质: ${m.selected.protein}g | 碳水: ${m.selected.carbs}g | 脂肪: ${m.selected.fat}g`,
                ].join('\n');
            })
            .join('\n\n');

        const goalLabel = goal === 'lose_fat' ? '减脂' : goal === 'gain_muscle' ? '增肌' : '维持';

        const tips = [];
        if (dietaryRestrictions) {
            tips.push(`⚠️ 饮食限制: ${dietaryRestrictions}`);
            tips.push('  - 请根据实际限制替换食材（如乳糖不耐受用植物奶替代牛奶）');
        }

        if (goal === 'lose_fat') {
            tips.push('💡 减脂饮食提示:');
            tips.push('  - 多吃高蛋白食物增加饱腹感');
            tips.push('  - 蔬菜不限量，优先选择绿叶蔬菜');
            tips.push('  - 控制烹饪用油，优先蒸、煮、烤');
        } else if (goal === 'gain_muscle') {
            tips.push('💡 增肌饮食提示:');
            tips.push('  - 训练后 30 分钟内补充蛋白质 + 快速碳水');
            tips.push('  - 不要害怕碳水，它是训练的能量来源');
            tips.push('  - 睡前可补充酪蛋白（如牛奶、酸奶）');
        }

        return [
            `📋 每日饮食计划 (${goalLabel})`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `目标热量: ${targetCalories} kcal`,
            `宏量素目标: 蛋白质 ${Math.round(targetCalories * macros.proteinRatio / 4)}g | 碳水 ${Math.round(targetCalories * macros.carbRatio / 4)}g | 脂肪 ${Math.round(targetCalories * macros.fatRatio / 9)}g`,
            ``,
            mealDetails,
            ``,
            `📊 全天总计:`,
            `   热量: ${totals.calories} kcal`,
            `   蛋白质: ${totals.protein}g`,
            `   碳水: ${totals.carbs}g`,
            `   脂肪: ${totals.fat}g`,
            ``,
            ...tips,
        ].join('\n');
    },
    {
        name: 'meal_plan_generator',
        description:
            '根据用户的目标热量、健身目标和饮食偏好，生成每日饮食计划。' +
            '包含每餐的具体食物选择、热量和宏量营养素分配。' +
            '支持减脂/增肌/维持不同目标，以及低碳/高蛋白等饮食偏好。' +
            '当用户说"帮我制定饮食计划"、"我该吃什么"、"给我一个食谱"时使用。',
        schema: z.object({
            targetCalories: z.number().describe('每日目标热量摄入 (kcal)'),
            goal: z.enum(['lose_fat', 'gain_muscle', 'maintain']).describe('目标: lose_fat=减脂, gain_muscle=增肌, maintain=维持'),
            mealsPerDay: z.number().min(3).max(5).optional().describe('每日餐数 (3-5)，默认 3 餐'),
            preference: z.enum(['low_carb', 'high_protein', 'balanced']).optional().describe('饮食偏好: low_carb=低碳, high_protein=高蛋白, balanced=均衡'),
            dietaryRestrictions: z.string().optional().describe('饮食限制，如"乳糖不耐受"、"素食"、"不吃牛肉"'),
        }),
    },
);
