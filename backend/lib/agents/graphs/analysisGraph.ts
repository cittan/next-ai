import { END, START, StateGraph } from '@langchain/langgraph';
import { AgentState } from '../state';
import { agentNode } from '../nodes/agentNode';
import { createToolNode } from '../nodes/toolNode';
import { routeAfterAgent } from '../nodes/router';
import { bmiCalculatorTool } from '../tools/bmiCalculatorTool';
import { nutritionLookupTool } from '../tools/nutritionLookupTool';

/**
 * 身体分析子图：BMI/BMR/TDEE 计算 + 营养查询
 */
export function createAnalysisGraph() {
    const tools = [bmiCalculatorTool, nutritionLookupTool];
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
