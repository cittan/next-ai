import { chatCompletion } from "@/lib/ai/client";


export async function rewritQuery(p: { question: string; historySummary: string; recentTranscript: string }){
    if(!p.historySummary && !p.recentTranscript) return { rewrittenQuestion: p.question, subQuestions: [p.question] };
    const r = await chatCompletion([
            { role: "system", content: "你是查询改写助手。根据上下文消除指代词、拆分子问题。输出JSON: {\"rewrittenQuestion\":\"\",\"subQuestions\":[]}" },
            { role: 'user', content: `摘要:${p.historySummary || '无'}\n历史:${p.recentTranscript || '无'}\n问题:${p.question}` },
        ]
    )
    try {
        const j = JSON.parse(r.content);
        return { rewrittenQuestion: j.rewrittenQuestion || p.question, subQuestions: j.subQuestions || [p.question] }; 
    } catch {
        return { rewrittenQuestion: p.question, subQuestions: [p.question] };
    }
}