import { getChatModel } from "@/lib/ai/chatModel";
import { tavilySearchTool } from "../tools/searchTools";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { AgentStateShape } from "../state";

const tools = [tavilySearchTool];
const model = getChatModel().bindTools(tools);

const MAX_LLM_CALLS = 8;

export async function agentNode(
    state: AgentStateShape,
): Promise<Partial<AgentStateShape>> {
    const messages = [
        new SystemMessage(
            `你是Super Agent。当前日期:${new Date().toISOString().slice(0, 10)}。${state.longTermSummary ? `历史摘要:${state.longTermSummary}` : ''}`,
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