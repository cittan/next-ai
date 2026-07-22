import { config } from "../../config";
import { RetrievalResult, vectorChannelRecall } from "./vectorChannel";
import { keywordChannelRecall } from "./keywordChannel";


//rrf的60是经典值，用来平滑排名靠后文档的得分
function rrfFusion(a: RetrievalResult[], b: RetrievalResult[], k = 60): RetrievalResult[] {
    //使用map作为存储文档与得分的关系
    const m = new Map<string, {r: RetrievalResult, s: number}>();
    a.forEach((x, i) => {
        //用文档id加文档拆分后的chunkid作为key，避免chunk重复
        const key = `d${x.documentId}_c${x.chunkId}`;
        //rrf进行归一化
        m.set(key, {r: x, s: 1 / (k + i + 1) });
    })
    b.forEach((x, i) => {
        //如果map中已经有了这个文档，就更新为两者最大值得分
        const key = `d${x.documentId}_c${x.chunkId}`;
        const e = m.get(key);
        if(e) {
            e.s += 1 / (k + i + 1);
            if(x.score > e.r.score) {
                e.r = x;
            }
        }else m.set(key, { r: x, s: 1 / (k + i + 1) });
    })
    return Array.from(m.values()).sort((a, b) => b.s - a.s).slice(0, config.rag.finalTopK).map((x) => x.r);
}

export async function retrieve(query: string): Promise<{ results: RetrievalResult[]; evidenceText: string }> {
    const [v, kw] = await Promise.all([vectorChannelRecall(query), keywordChannelRecall(query)]);
    const fused = rrfFusion(v, kw);
    return { results: fused, evidenceText: fused.map((r, i) => `[来源${i + 1}] ${r.content}`).join('\n\n') };
}