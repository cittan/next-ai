import { END, START, StateGraph } from '@langchain/langgraph';
import { AgentState } from '../state';
import { agentNode } from '../nodes/agentNode';
import { createToolNode } from '../nodes/toolNode';
import { routeAfterAgent } from '../nodes/router';
import { mealPlanTool } from '../tools/mealPlanTool';
import { nutritionLookupTool } from '../tools/nutritionLookupTool';

/**
 * 饮食规划子图：饮食计划生成 + 营养查询
 */
export function createMealGraph() {
    const tools = [mealPlanTool, nutritionLookupTool];
    const toolNode = createToolNode(tools, 5);

    return new StateGraph(AgentState)
        .addNode('agent', agentNode)
        .addNode('tools', toolNode)
        .addEdge(START, 'agent')
        .addEdge('tools', 'agent')
        .addConditionalEdges('agent', routeAfterAgent, {
            tools: 'tools',
            __end__: END,
        })
        .compile() as any;
}
