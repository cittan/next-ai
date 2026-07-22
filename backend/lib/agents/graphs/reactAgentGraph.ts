import { END, START, StateGraph } from '@langchain/langgraph';
import { AgentState } from '../state';
import { agentNode } from '../nodes/agentNode';
import { createToolNode } from '../nodes/toolNode';
import { routeAfterAgent } from '../nodes/router';
import { tavilySearchTool } from '../tools/searchTools';

const MAX_TOOL_CALLS = 10;

export function createReactGraph() {
    const toolNode = createToolNode([tavilySearchTool], MAX_TOOL_CALLS);

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