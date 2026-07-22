import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import type { AgentStateShape } from '../state';

/** 创建工具执行节点（工厂函数） */
export function createToolNode(tools: StructuredTool[], maxToolCalls: number) {
  const toolMap = new Map<string, StructuredTool>();
  for (const t of tools) {
    toolMap.set(t.name, t);
  }

  return async function toolNode(
    state: AgentStateShape,
  ): Promise<Partial<AgentStateShape>> {
    const lastMessage = state.messages[state.messages.length - 1];
    const toolCalls = lastMessage instanceof AIMessage ? lastMessage.tool_calls : [];

    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      return {};
    }

    const toolTraces: unknown[] = [];
    const results: ToolMessage[] = [];
    let executedCount = 0;

    for (const call of toolCalls) {
      const callId = call.id ?? '';
      if (state.toolCallCount + executedCount >= maxToolCalls) {
        results.push(
          new ToolMessage({
            content: `已达到工具调用上限 (${maxToolCalls})`,
            tool_call_id: callId,
          }),
        );
        break;
      }

      const tool = toolMap.get(call.name);
      if (!tool) {
        results.push(
          new ToolMessage({
            content: `未知工具: ${call.name}`,
            tool_call_id: callId,
          }),
        );
        continue;
      }

      try {
        const result = await tool.invoke(call.args);
        const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

        toolTraces.push({
          toolName: call.name,
          input: call.args,
          output: resultStr.slice(0, 500),
          success: true,
        });

        results.push(
          new ToolMessage({
            content: resultStr,
            tool_call_id: callId,
          }),
        );
        executedCount++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        toolTraces.push({
          toolName: call.name,
          input: call.args,
          error: message,
          success: false,
        });

        results.push(
          new ToolMessage({
            content: `工具执行出错: ${message}`,
            tool_call_id: callId,
          }),
        );
      }
    }

    return {
      messages: results,
      toolCallCount: state.toolCallCount + executedCount,
      toolTraces,
    };
  };
}
