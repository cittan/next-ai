import { keywordSearch } from "@/lib/db/elasticsearch";
import { config } from "../../config";


export async function keywordChannelRecall(query: string, topK = config.rag.keywordTopK) {
    try {
        const r = await keywordSearch(query, topK);
        return r.map((x) => ({ 
            documentId: parseInt(x.documentId), 
            chunkId: parseInt(x.chunkId), 
            content: x.content, 
            score: x.score, 
            channel: 'keyword' as const 
        }));
    } catch(e) {
        console.error('[KeywordChannel]', e); 
        return [];
    }
}