import { ChatQueryMode, ExecutionMode } from "@/lib/models/enum";
import { conversationManager } from "./ConversationManager";
import { memoryStore } from "../memory/memoryStore";
import { assembleContext } from "../memory/contextAssembler";
import { rewriteQuery } from "./queryRewriteService";
import { routeKnowledge } from "./knowledgeRouter";


export async function prepareExecutionPlan(p: { conversationId: string; question: string; chatMode: ChatQueryMode; userId?: number; selectedDocumentId?: string }) {
    //1. 检查会话是否存在,如果不存在则创建会话
    let session = await conversationManager.getSession(p.conversationId);
    if (!session) await conversationManager.createSession({ conversationId: p.conversationId, chatMode: p.chatMode, userId: p.userId });
    //2.把会话记忆组装到上下文对象中
    const ctx = await assembleContext(p.conversationId, memoryStore);
    //3.生成对话id：每次对话为一个exchange，ID递增
    const eid = (await conversationManager.getLatestExchangeId(p.conversationId)) + 1;
    await conversationManager.createExchange({ conversationId: p.conversationId, exchangeId: eid, question: p.question });
    //原问题拆解为多个子问题，每个子问题对应一个执行计划
    let rwQuestion = p.question;
    let subQs: string[] = [];
    try {
        const rw = await rewriteQuery({ question: p.question, historySummary: ctx.longTermSummary, recentTranscript: ctx.recentTranscript });
        rwQuestion = rw.rewrittenQuestion; 
        subQs = rw.subQuestions;
    } catch {}
    //5. 知识路由：根据改写后的问题在ES中检索相关文档
    let retrievalDocIds: number[] = [];
    try {
        const kr = await routeKnowledge(rwQuestion);
        retrievalDocIds = kr.documents.map(d => parseInt(d.documentId)).filter(id => !isNaN(id));
    } catch {}
    // 6. 模式决策：自由对话→Agent模式；文档模式→有匹配文档则RAG模式，否则降级为React模式
    let mode = p.chatMode === ChatQueryMode.OPEN_CHAT ? 
    ExecutionMode.REACT_AGENT : (retrievalDocIds.length > 0 ? ExecutionMode.RAG_CHAT : ExecutionMode.REACT_AGENT);
    // 返回完整的执行计划，包含所有上下文信息供后续步骤使用
    return { conversationId: p.conversationId, exchangeId: eid, mode, 
        rewrittenQuestion: rwQuestion, subQuestions: subQs, 
        retrievalDocumentIds: retrievalDocIds, 
        longTermSummary: ctx.longTermSummary, recentTranscript: ctx.recentTranscript, answerRecentTranscript: ctx.answerRecentTranscript 
    };
}