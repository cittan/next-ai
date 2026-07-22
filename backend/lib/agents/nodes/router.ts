import { AIMessage } from '@langchain/core/messages';
// 条件路由函数：根据Agent节点最后一条消息决定下一步走向
export function routeAfterAgent(state: any): 'tools' | '__end__' {
  const last = state.messages[state.messages.length - 1];
  // 如果最后的AI消息包含工具调用请求，则进入工具节点执行；否则结束整个流程
  return (last instanceof AIMessage && last.tool_calls?.length) ? 'tools' : '__end__';
}