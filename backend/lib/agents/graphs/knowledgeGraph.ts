import { END, START, StateGraph } from '@langchain/langgraph';
import { AgentState } from '../state';
import { agentNode } from '../nodes/agentNode';
import { createToolNode } from '../nodes/toolNode';
import { routeAfterAgent } from '../nodes/router';
import { knowledgeBaseTool } from '../tools/knowledgeBaseTool';
import { tavilySearchTool } from '../tools/searchTools';

/**
 * 知识问答子图：知识库检索 + 网络搜索
 */
export function createKnowledgeGraph() {
    const tools = [knowledgeBaseTool, tavilySearchTool];
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
