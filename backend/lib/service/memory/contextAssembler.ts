import { MemoryStore } from "./memoryStore";

//上下文组装，把最近的对话记录和记忆摘要组装成一个上下文
export async function assembleContext(conversationId: string, ms: MemoryStore) {
    const summary = await ms.getLatestSummary(conversationId);
    const recentExchanges = await ms.getRecentExchanges(conversationId, 4);
    const transcript = recentExchanges?.map(e => `用户: ${e.question}\n助手: ${e.answer}`).join('\n') ?? '';
    const answerTranscript = recentExchanges?.slice(-2).map(e => `助手: ${e.answer}`).join('\n') ?? '';
    return {
        longTermSummary: summary?.summary || '',
        recentTranscript: transcript,
        answerRecentTranscript: answerTranscript,
        compressionApplied: !!summary,
        coveredExchangeId: summary?.coveredExchangeId || '',
        compressionCount: summary?.compressionCount || 0,
        summaryPayload: summary,
    }
}

export function shouldCompress(latest: any, exchanges: { exchangeId: number }[]) {
    if(exchanges.length < 10){
        return false;
    }
    const lastCompress = latest?.coveredExchangeId || 0;
    const latestId = exchanges[exchanges.length - 1].exchangeId;
    return latestId - lastCompress >= 10;
}