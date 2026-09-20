import { END, START, StateGraph } from '@langchain/langgraph';
import { AgentState } from '../state';
import { agentNode } from '../nodes/agentNode';
import { createToolNode } from '../nodes/toolNode';
import { routeAfterAgent } from '../nodes/router';
import { tavilySearchTool } from '../tools/searchTools';

/**
 * 通用对话子图：仅使用网络搜索
 */
export function createGeneralGraph() {
    const tools = [tavilySearchTool];
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
