import { chatCompletion } from "@/lib/ai/client";


export async function compressMemory(p: { existingSummary: any, newExchanges: { exchangeId: number, question: string, answer: string }[] }) {
    //把多轮对话格式化并拼接成一个可读的文本块
    const transcript = p.newExchanges.map((e) => `[${e.exchangeId}] ${e.question}: ${e.answer.slice(0, 300)}`).join("\n");
    const prev = p.existingSummary ? `${p.existingSummary}\n` : '无';
    const r = await chatCompletion([
        {
            role: 'system',
            content: '你是一个记忆压缩助手。根据现有摘要和新的对话，输出 JSON: { "summary":"<500字摘要>", "stableFacts":[], "pendingQuestions":[], "retrievalHints":[], "conversationGoal":"", "resolvedPoints":[] }',
        },
        {
            role: 'user',
            content: `现有摘要: ${prev}，新的对话: ${transcript}`,
        }
    ]);
    try {
        const j = JSON.parse(r.content);
        //提取最后一个exchangeId用作后面的增量压缩
        const lastId = p.newExchanges[p.newExchanges.length - 1]?.exchangeId || 0;
        return {
            coveredExchangeId: lastId,
            compressionCount: (p.existingSummary?.compressionCount || 0) + 1,
            conversationGoal: j.conversationGoal,
            summary: j.summary || '',
            stableFacts: j.stableFacts || [],
            pendingQuestions: j.pendingQuestions || [],
            retrievalHints: j.retrievalHints || [],
            resolvedPoints: j.resolvedPoints || [],
            tokenUsed: r.usage.totalTokens,
        }
    } catch {
        //如果解析失败，降级返回一个默认的摘要
        return {
            coveredExchangeId: 0,
            compressionCount: 1,
            summary: transcript.slice(0, 500),
            stableFacts: [],
            pendingQuestions: [],
            retrievalHints: [],
            resolvedPoints: [],
            tokenUsed: 0,
        }
    }
}