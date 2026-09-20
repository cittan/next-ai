import { getChatModel } from "@/lib/ai/chatModel";
import { tavilySearchTool } from "../tools/searchTools";
import { bmiCalculatorTool } from "../tools/bmiCalculatorTool";
import { nutritionLookupTool } from "../tools/nutritionLookupTool";
import { exerciseDBTool } from "../tools/exerciseDBTool";
import { workoutPlanTool } from "../tools/workoutPlanTool";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AgentStateShape } from "../state";

const tools = [tavilySearchTool, bmiCalculatorTool, nutritionLookupTool, exerciseDBTool, workoutPlanTool];
const model = getChatModel().bindTools(tools);

const MAX_LLM_CALLS = 8;

export async function agentNode(
    state: AgentStateShape,
): Promise<Partial<AgentStateShape>> {
    const messages = [
        new SystemMessage(
            `你是一个专业的健身与饮食规划助手。你可以帮助用户：
1. 计算 BMI、基础代谢率 (BMR)、每日总消耗 (TDEE)
2. 查询食物营养成分（热量、蛋白质、脂肪、碳水）
3. 搜索最新的健身资讯和科学研究
4. 根据用户目标（减脂/增肌/维持）给出饮食和训练建议

当前日期:${new Date().toISOString().slice(0, 10)}。${state.longTermSummary ? `历史摘要:${state.longTermSummary}` : ''}`,
        ),
        ...(state.messages || []),
        new HumanMessage(state.userQuestion),
    ];

    if (state.llmCallCount >= MAX_LLM_CALLS) {
        const r = await model.invoke([
            ...messages,
            new HumanMessage('已达最大调用次数，请给出最终回答'),
        ]);
        return {
            messages: [r],
            finalAnswer: typeof r.content === 'string' ? r.content : '',
        };
    }

    const r = await model.invoke(messages);
    return {
        messages: [r],
        llmCallCount: (state.llmCallCount ?? 0) + 1,
    };
}