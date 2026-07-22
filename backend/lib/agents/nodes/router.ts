import { AIMessage } from '@langchain/core/messages';

/** 条件路由：根据最后一条消息决定走工具节点还是结束 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function routeAfterAgent(state: any): 'tools' | '__end__' {
  const last = state.messages?.[state.messages.length - 1];
  return last instanceof AIMessage && last.tool_calls?.length ? 'tools' : '__end__';
}