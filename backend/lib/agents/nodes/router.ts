import { AIMessage } from '@langchain/core/messages';

/** 条件路由：根据最后一条消息决定走工具节点还是结束 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function routeAfterAgent(state: any): 'tools' | '__end__' {
  const last = state.messages?.[state.messages.length - 1];
  return last instanceof AIMessage && last.tool_calls?.length ? 'tools' : '__end__';
}

/** 意图路由：根据 routeIntent 分发到对应的处理子图 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function routeAfterRouter(state: any): string {
  const intent = state.routeIntent || 'general_chat';

  switch (intent) {
    case 'body_analysis':
    case 'nutrition_query':
      return 'analysis_agent';
    case 'exercise_query':
    case 'workout_plan':
      return 'exercise_agent';
    case 'meal_plan':
      return 'meal_agent';
    case 'knowledge_qa':
      return 'knowledge_agent';
    default:
      return 'general_agent';
  }
}