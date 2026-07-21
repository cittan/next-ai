import { createEmbedding } from '../../ai/client';
import { vectorSearch } from '../../db/pgvector';
import { config } from '../../config';


export interface RetrievalResult {
    documentId: number,
    chunkId: number,
    content: string,
    score: number,
    channel: 'vector' | 'keyword'
}

export async function vectorChannelRecall(query: string, topK = config.rag.vectorTopK): Promise<RetrievalResult[]> {
    try {
        const embed = await createEmbedding(query);
        const r = await vectorSearch(embed, topK, config.rag.minVectorSimilarity);
        return r.map((x) => ({
            ...x,
            score: x.similarity, 
            channel: 'vector' as const
        }))
    } catch(e: any) {
        console.error('[VectorChannel]', e); return [];
    }
}
