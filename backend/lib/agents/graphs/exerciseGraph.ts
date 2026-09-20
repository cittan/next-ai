import { END, START, StateGraph } from '@langchain/langgraph';
import { AgentState } from '../state';
import { agentNode } from '../nodes/agentNode';
import { createToolNode } from '../nodes/toolNode';
import { routeAfterAgent } from '../nodes/router';
import { exerciseDBTool } from '../tools/exerciseDBTool';
import { workoutPlanTool } from '../tools/workoutPlanTool';

/**
 * 运动训练子图：运动数据库 + 训练计划生成
 */
export function createExerciseGraph() {
    const tools = [exerciseDBTool, workoutPlanTool];
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
