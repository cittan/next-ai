import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * 食物营养查询工具
 * 内置常见食物营养数据库（每 100g），支持模糊搜索
 */

interface FoodNutrition {
    name: string;
    calories: number;    // 热量 kcal
    protein: number;     // 蛋白质 g
    fat: number;         // 脂肪 g
    carbs: number;       // 碳水 g
    fiber: number;       // 膳食纤维 g
    category: string;    // 分类
    aliases: string[];   // 别名
}

/** 常见食物营养数据（每 100g 可食部分） */
const FOOD_DB: FoodNutrition[] = [
    // ===== 主食 =====
    { name: '米饭(熟)', calories: 116, protein: 2.6, fat: 0.3, carbs: 25.9, fiber: 0.4, category: '主食', aliases: ['白饭', '大米饭'] },
    { name: '馒头', calories: 221, protein: 7.0, fat: 1.1, carbs: 44.2, fiber: 1.3, category: '主食', aliases: ['白馒头'] },
    { name: '全麦面包', calories: 247, protein: 13.0, fat: 3.4, carbs: 41.0, fiber: 6.0, category: '主食', aliases: ['全麦'] },
    { name: '燕麦(干)', calories: 367, protein: 13.5, fat: 6.7, carbs: 61.6, fiber: 10.6, category: '主食', aliases: ['燕麦片', '即食燕麦'] },
    { name: '红薯(熟)', calories: 90, protein: 2.0, fat: 0.1, carbs: 20.7, fiber: 3.0, category: '主食', aliases: ['地瓜', '番薯'] },
    { name: '玉米(熟)', calories: 112, protein: 4.0, fat: 1.2, carbs: 22.0, fiber: 2.9, category: '主食', aliases: ['甜玉米'] },
    { name: '糙米饭(熟)', calories: 123, protein: 2.7, fat: 0.9, carbs: 25.6, fiber: 1.8, category: '主食', aliases: ['糙米'] },
    { name: '面条(熟)', calories: 137, protein: 4.5, fat: 0.2, carbs: 27.0, fiber: 1.0, category: '主食', aliases: ['挂面', '拉面'] },

    // ===== 肉类 =====
    { name: '鸡胸肉', calories: 133, protein: 31.0, fat: 1.2, carbs: 0, fiber: 0, category: '肉类', aliases: ['鸡脯肉'] },
    { name: '鸡腿肉(去皮)', calories: 150, protein: 26.0, fat: 5.0, carbs: 0, fiber: 0, category: '肉类', aliases: ['鸡腿'] },
    { name: '猪里脊', calories: 155, protein: 20.2, fat: 7.9, carbs: 0.7, fiber: 0, category: '肉类', aliases: ['猪柳'] },
    { name: '猪五花', calories: 349, protein: 14.0, fat: 32.0, carbs: 0, fiber: 0, category: '肉类', aliases: ['五花肉', '三层肉'] },
    { name: '牛里脊', calories: 122, protein: 22.0, fat: 3.0, carbs: 0, fiber: 0, category: '肉类', aliases: ['牛柳', '菲力'] },
    { name: '牛腱子', calories: 106, protein: 20.1, fat: 2.3, carbs: 0.1, fiber: 0, category: '肉类', aliases: ['牛腱'] },
    { name: '羊肉(瘦)', calories: 118, protein: 20.5, fat: 3.6, carbs: 0.2, fiber: 0, category: '肉类', aliases: ['瘦羊肉'] },

    // ===== 水产 =====
    { name: '三文鱼', calories: 139, protein: 21.3, fat: 5.8, carbs: 0, fiber: 0, category: '水产', aliases: ['鲑鱼', 'salmon'] },
    { name: '虾仁', calories: 87, protein: 18.6, fat: 0.8, carbs: 0.5, fiber: 0, category: '水产', aliases: ['虾', '基围虾', '对虾'] },
    { name: '鳕鱼', calories: 82, protein: 17.8, fat: 0.5, carbs: 0, fiber: 0, category: '水产', aliases: ['cod'] },
    { name: '鲈鱼', calories: 105, protein: 18.6, fat: 3.4, carbs: 0, fiber: 0, category: '水产', aliases: ['海鲈鱼'] },
    { name: '金枪鱼(罐头)', calories: 116, protein: 25.5, fat: 1.0, carbs: 0, fiber: 0, category: '水产', aliases: ['吞拿鱼', 'tuna'] },

    // ===== 蛋奶 =====
    { name: '鸡蛋(全)', calories: 144, protein: 13.3, fat: 9.5, carbs: 1.5, fiber: 0, category: '蛋奶', aliases: ['蛋', '鸡蛋'] },
    { name: '鸡蛋白', calories: 47, protein: 11.0, fat: 0.2, carbs: 0.7, fiber: 0, category: '蛋奶', aliases: ['蛋白'] },
    { name: '牛奶(全脂)', calories: 65, protein: 3.3, fat: 3.6, carbs: 4.8, fiber: 0, category: '蛋奶', aliases: ['纯牛奶'] },
    { name: '脱脂牛奶', calories: 36, protein: 3.4, fat: 0.1, carbs: 5.0, fiber: 0, category: '蛋奶', aliases: ['低脂奶'] },
    { name: '酸奶(原味)', calories: 72, protein: 3.1, fat: 2.7, carbs: 9.3, fiber: 0, category: '蛋奶', aliases: ['原味酸奶'] },
    { name: '希腊酸奶', calories: 97, protein: 9.0, fat: 5.0, carbs: 3.6, fiber: 0, category: '蛋奶', aliases: ['脱乳清酸奶'] },

    // ===== 豆制品 =====
    { name: '豆腐(北)', calories: 98, protein: 12.2, fat: 4.8, carbs: 2.6, fiber: 0.5, category: '豆制品', aliases: ['老豆腐', '硬豆腐'] },
    { name: '豆腐(嫩)', calories: 62, protein: 6.2, fat: 2.5, carbs: 3.6, fiber: 0.2, category: '豆制品', aliases: ['内酯豆腐', '嫩豆腐'] },
    { name: '豆浆(无糖)', calories: 31, protein: 2.9, fat: 1.6, carbs: 1.2, fiber: 0.1, category: '豆制品', aliases: ['豆奶'] },
    { name: '毛豆', calories: 131, protein: 13.1, fat: 5.0, carbs: 8.7, fiber: 4.0, category: '豆制品', aliases: ['菜用大豆'] },

    // ===== 蔬菜 =====
    { name: '西兰花', calories: 34, protein: 2.8, fat: 0.4, carbs: 4.3, fiber: 2.6, category: '蔬菜', aliases: ['绿花菜'] },
    { name: '菠菜', calories: 23, protein: 2.9, fat: 0.4, carbs: 1.3, fiber: 1.7, category: '蔬菜', aliases: [] },
    { name: '番茄', calories: 18, protein: 0.9, fat: 0.2, carbs: 3.5, fiber: 1.2, category: '蔬菜', aliases: ['西红柿'] },
    { name: '黄瓜', calories: 15, protein: 0.7, fat: 0.1, carbs: 2.9, fiber: 0.5, category: '蔬菜', aliases: [] },
    { name: '生菜', calories: 13, protein: 1.3, fat: 0.3, carbs: 1.3, fiber: 0.7, category: '蔬菜', aliases: ['叶用莴苣'] },
    { name: '胡萝卜', calories: 37, protein: 1.0, fat: 0.2, carbs: 7.6, fiber: 2.8, category: '蔬菜', aliases: ['红萝卜'] },
    { name: '芹菜', calories: 14, protein: 0.7, fat: 0.1, carbs: 2.2, fiber: 1.5, category: '蔬菜', aliases: ['西芹'] },

    // ===== 水果 =====
    { name: '苹果', calories: 52, protein: 0.3, fat: 0.2, carbs: 13.8, fiber: 2.4, category: '水果', aliases: [] },
    { name: '香蕉', calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8, fiber: 2.6, category: '水果', aliases: [] },
    { name: '橙子', calories: 47, protein: 0.9, fat: 0.1, carbs: 11.8, fiber: 2.4, category: '水果', aliases: ['橘子', '柑橘'] },
    { name: '蓝莓', calories: 57, protein: 0.7, fat: 0.3, carbs: 14.5, fiber: 2.4, category: '水果', aliases: ['蓝莓'] },
    { name: '草莓', calories: 32, protein: 0.7, fat: 0.3, carbs: 7.7, fiber: 2.0, category: '水果', aliases: [] },
    { name: '猕猴桃', calories: 61, protein: 1.1, fat: 0.5, carbs: 14.7, fiber: 3.0, category: '水果', aliases: ['奇异果'] },

    // ===== 坚果 =====
    { name: ' almonds(杏仁)', calories: 579, protein: 21.2, fat: 49.9, carbs: 19.7, fiber: 12.5, category: '坚果', aliases: ['杏仁', '巴旦木'] },
    { name: '核桃', calories: 654, protein: 15.2, fat: 65.2, carbs: 13.7, fiber: 6.7, category: '坚果', aliases: [] },
    { name: '花生', calories: 567, protein: 25.8, fat: 49.2, carbs: 16.1, fiber: 8.5, category: '坚果', aliases: ['落花生'] },

    // ===== 油脂/调料 =====
    { name: '橄榄油', calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, category: '油脂', aliases: [] },
    { name: '花生酱', calories: 588, protein: 25.1, fat: 50.4, carbs: 19.6, fiber: 6.0, category: '油脂', aliases: [] },

    // ===== 常见快餐/外卖 =====
    { name: '肯德基炸鸡腿', calories: 279, protein: 18.0, fat: 17.0, carbs: 12.0, fiber: 0.5, category: '快餐', aliases: ['炸鸡腿'] },
    { name: '汉堡(牛肉)', calories: 295, protein: 17.0, fat: 14.0, carbs: 26.0, fiber: 1.0, category: '快餐', aliases: ['牛肉汉堡'] },
    { name: '披萨(芝士)', calories: 266, protein: 11.0, fat: 10.0, carbs: 33.0, fiber: 2.0, category: '快餐', aliases: ['芝士披萨'] },
    { name: '薯条', calories: 312, protein: 3.4, fat: 15.0, carbs: 41.0, fiber: 3.8, category: '快餐', aliases: ['炸薯条'] },
];

/** 模糊匹配食物 */
function searchFood(query: string): FoodNutrition[] {
    const q = query.toLowerCase().trim();
    return FOOD_DB.filter((f) => {
        if (f.name.toLowerCase().includes(q)) return true;
        if (f.category.includes(q)) return true;
        return f.aliases.some((a) => a.toLowerCase().includes(q));
    });
}

export const nutritionLookupTool = tool(
    async ({ foodName, weightGrams }) => {
        const matches = searchFood(foodName);

        if (matches.length === 0) {
            return `未找到 "${foodName}" 的营养数据。目前支持查询的食物类别：${[...new Set(FOOD_DB.map((f) => f.category))].join('、')}。请尝试用更通用的名称搜索，例如"鸡胸肉"、"米饭"、"鸡蛋"。`;
        }

        const grams = weightGrams || 100;
        const ratio = grams / 100;

        const results = matches.slice(0, 5).map((f) => {
            return [
                `【${f.name}】(${f.category}) — 每 ${grams}g`,
                `  热量: ${Math.round(f.calories * ratio)} kcal`,
                `  蛋白质: ${(f.protein * ratio).toFixed(1)}g`,
                `  脂肪: ${(f.fat * ratio).toFixed(1)}g`,
                `  碳水: ${(f.carbs * ratio).toFixed(1)}g`,
                `  膳食纤维: ${(f.fiber * ratio).toFixed(1)}g`,
            ].join('\n');
        });

        return `🔍 "${foodName}" 营养查询结果（${grams}g）：\n\n${results.join('\n\n')}`;
    },
    {
        name: 'nutrition_lookup',
        description:
            '查询食物的营养成分信息，包括热量、蛋白质、脂肪、碳水化合物和膳食纤维。' +
            '内置常见食物数据库（主食、肉类、水产、蛋奶、蔬菜、水果、坚果、快餐等）。' +
            '当用户询问某种食物的热量、营养成分，或想知道某个食物是否适合减脂/增肌时使用。' +
            '输入食物名称即可查询，可选指定克数（默认100g）。',
        schema: z.object({
            foodName: z.string().describe('食物名称，如"鸡胸肉"、"米饭"、"鸡蛋"'),
            weightGrams: z.number().optional().describe('食物重量（克），默认100g'),
        }),
    },
);
