import { getChatModel } from "@/lib/ai/chatModel";
import { tavilySearchTool } from "../tools/searchTools";
import { HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";

/** Agent 节点的输入状态 */
interface AgentNodeState {
    messages: BaseMessage[];
    callCount: number;
    userMessage: string;
    longTermSummary?: string;
}

/** Agent 节点的返回结果 */
interface AgentNodeResult {
    messages: BaseMessage[];
    callCount?: number;
    finalAnswer?: string;
}

const tools = [tavilySearchTool];
const model = getChatModel().bindTools(tools);

export async function agentNode(state: AgentNodeState): Promise<AgentNodeResult> {
    const messages = [
        new SystemMessage(
            `你是Super Agent。当前日期:${new Date().toISOString().slice(0, 10)}。${state.longTermSummary ? `历史摘要:${state.longTermSummary}` : ''}`
        ),
        ...(state.messages || []),
        new HumanMessage(state.userMessage),
    ]
    if (state.callCount > 8) {
        const r = await model.invoke([...messages, new HumanMessage('已达最大调用次数，请给出最终回答')]);
        return { messages: [r], finalAnswer: typeof r.content === 'string' ? r.content : '' }
    }
    const r = await model.invoke(messages);
    return { messages: [r], callCount: (state.callCount ?? 0) + 1 }
}