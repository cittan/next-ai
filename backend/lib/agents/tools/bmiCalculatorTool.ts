import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * BMI / TDEE / 基础代谢 计算工具
 * 纯本地计算，不依赖外部 API
 */

/** Mifflin-St Jeor 公式计算基础代谢率 (BMR) */
function calcBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
    if (gender === 'male') {
        return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
    }
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
}

/** 根据活动等级计算 TDEE */
function calcTDEE(bmr: number, activityLevel: string): number {
    const multipliers: Record<string, number> = {
        sedentary: 1.2,       // 久坐不动
        light: 1.375,         // 轻度活动（每周1-3天）
        moderate: 1.55,       // 中度活动（每周3-5天）
        active: 1.725,        // 高度活动（每周6-7天）
        very_active: 1.9,     // 极高活动（体力劳动/双练）
    };
    return Math.round(bmr * (multipliers[activityLevel] ?? 1.375));
}

/** BMI 分类 */
function bmiCategory(bmi: number): string {
    if (bmi < 18.5) return '偏瘦';
    if (bmi < 24) return '正常';
    if (bmi < 28) return '偏胖';
    return '肥胖';
}

/** 根据目标给出建议摄入 */
function suggestCalorieIntake(tdee: number, goal: string): number {
    switch (goal) {
        case 'lose_fat': return tdee - 500;  // 减脂：热量缺口 500kcal
        case 'gain_muscle': return tdee + 300; // 增肌：热量盈余 300kcal
        default: return tdee;                  // 维持
    }
}

export const bmiCalculatorTool = tool(
    async ({ weight, height, age, gender, activityLevel, goal }) => {
        const bmi = +(weight / ((height / 100) ** 2)).toFixed(1);
        const bmr = calcBMR(weight, height, age, gender);
        const tdee = calcTDEE(bmr, activityLevel);
        const targetCalories = suggestCalorieIntake(tdee, goal);

        // 宏量营养素建议
        const proteinMin = Math.round(weight * 1.6); // 增肌 1.6-2.2g/kg
        const proteinMax = Math.round(weight * 2.2);
        const fatCalories = Math.round(targetCalories * 0.25); // 脂肪占 25%
        const fatGrams = Math.round(fatCalories / 9);
        const carbCalories = targetCalories - proteinMin * 4 - fatCalories;
        const carbGrams = Math.round(carbCalories / 4);

        return [
            `📊 身体数据分析结果：`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `BMI: ${bmi}（${bmiCategory(bmi)}）`,
            `基础代谢 (BMR): ${bmr} kcal/天`,
            `每日总消耗 (TDEE): ${tdee} kcal/天`,
            ``,
            `🎯 建议（目标: ${goal === 'lose_fat' ? '减脂' : goal === 'gain_muscle' ? '增肌' : '维持'}）：`,
            `每日建议摄入: ${targetCalories} kcal`,
            `蛋白质: ${proteinMin}-${proteinMax}g/天`,
            `脂肪: ${fatGrams}g/天`,
            `碳水: ${carbGrams}g/天`,
        ].join('\n');
    },
    {
        name: 'bmi_calculator',
        description:
            '计算用户的 BMI、基础代谢率 (BMR)、每日总消耗 (TDEE)，并根据目标（减脂/增肌/维持）' +
            '给出每日建议热量摄入和宏量营养素（蛋白质/脂肪/碳水）分配。' +
            '当用户提供身高、体重等信息，或询问自己该吃多少、是否偏胖时使用。',
        schema: z.object({
            weight: z.number().describe('体重，单位 kg'),
            height: z.number().describe('身高，单位 cm'),
            age: z.number().describe('年龄'),
            gender: z.enum(['male', 'female']).describe('性别'),
            activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active'])
                .describe('活动等级: sedentary=久坐, light=轻度(每周1-3天), moderate=中度(每周3-5天), active=高度(每周6-7天), very_active=极高'),
            goal: z.enum(['lose_fat', 'maintain', 'gain_muscle'])
                .describe('目标: lose_fat=减脂, maintain=维持, gain_muscle=增肌'),
        }),
    },
);
