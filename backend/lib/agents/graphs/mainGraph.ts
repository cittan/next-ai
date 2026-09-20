import { END, START, StateGraph } from '@langchain/langgraph';
import { AgentState } from '../state';
import { routerNode } from '../nodes/routerNode';
import { routeAfterRouter } from '../nodes/router';
import { createAnalysisGraph } from './analysisGraph';
import { createExerciseGraph } from './exerciseGraph';
import { createMealGraph } from './mealGraph';
import { createKnowledgeGraph } from './knowledgeGraph';
import { createGeneralGraph } from './generalGraph';

/**
 * 主 DAG 图：Router -> 子图分发
 * 
 * 流程：
 * START -> router -> routeAfterRouter -> 子图 -> END
 */
export function createMainGraph() {
    // 创建专门的子图
    const analysisAgent = createAnalysisGraph();
    const exerciseAgent = createExerciseGraph();
    const mealAgent = createMealGraph();
    const knowledgeAgent = createKnowledgeGraph();
    const generalAgent = createGeneralGraph();

    return new StateGraph(AgentState)
        .addNode('router', routerNode)
        .addNode('analysis_agent', analysisAgent)
        .addNode('exercise_agent', exerciseAgent)
        .addNode('meal_agent', mealAgent)
        .addNode('knowledge_agent', knowledgeAgent)
        .addNode('general_agent', generalAgent)
        .addEdge(START, 'router')
        .addConditionalEdges('router', routeAfterRouter, {
            analysis_agent: 'analysis_agent',
            exercise_agent: 'exercise_agent',
            meal_agent: 'meal_agent',
            knowledge_agent: 'knowledge_agent',
            general_agent: 'general_agent',
        })
        .addEdge('analysis_agent', END)
        .addEdge('exercise_agent', END)
        .addEdge('meal_agent', END)
        .addEdge('knowledge_agent', END)
        .addEdge('general_agent', END)
        .compile() as any;
}
