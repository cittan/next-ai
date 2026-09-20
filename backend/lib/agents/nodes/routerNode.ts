import { getChatModel } from '@/lib/ai/chatModel';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AgentStateShape } from '../state';

/**
 * Router 节点：使用 LLM 识别用户意图并路由到对应的处理流程
 */

const ROUTER_PROMPT = `你是一个意图识别助手。根据用户的问题，判断其意图属于以下哪个类别：

1. body_analysis - 身体分析：计算 BMI、BMR、TDEE 等身体指标
2. nutrition_query - 营养查询：查询某种食物的营养成分（热量、蛋白质等）
3. exercise_query - 运动查询：查询某个动作怎么做、某个肌群有哪些动作
4. workout_plan - 训练计划：生成周训练计划、询问该练什么
5. meal_plan - 饮食计划：生成每日饮食计划、询问该吃什么
6. knowledge_qa - 知识问答：健身原理、营养学知识、运动科学等专业问题
7. general_chat - 一般聊天：不属于以上类别的对话

请只返回意图类别名称，不要返回其他内容。`;

export async function routerNode(state: AgentStateShape): Promise<Partial<AgentStateShape>> {
  const model = getChatModel();
  
  const messages = [
    new SystemMessage(ROUTER_PROMPT),
    new HumanMessage(state.userQuestion),
  ];

  const response = await model.invoke(messages);
  const intent = typeof response.content === 'string' ? response.content.trim() : 'general_chat';

  // 验证意图是否合法
  const validIntents = [
    'body_analysis',
    'nutrition_query',
    'exercise_query',
    'workout_plan',
    'meal_plan',
    'knowledge_qa',
    'general_chat',
  ];

  const routeIntent = validIntents.includes(intent) ? intent : 'general_chat';

  return {
    routeIntent,
  };
}
