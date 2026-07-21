import { getEsClient } from "@/lib/db/elasticsearch";
import { config } from "../../config";



export async function routeKnowledge(question: string) {
    const client = await getEsClient();
    const idx = config.elasticsearch.routeIndexName;
    const exists = await client.indices.exists({ index: idx });
    if(!exists) {
        return { documents: [], topScopes: [], topTopics: [] };
    }
    const r = await client.search({
        index: idx,
        body: {
            query: {
                multi_match: {
                    query: question,
                    fields: ['question', 'keyword^2'],
                }
            }
        }
    })
    const docIds = new Set<string>();
    r.hits.hits.forEach((h: any) => { (h._source.documentIds || [h._source.documentId]).forEach((id: string) => docIds.add(id)); })
    return { documents: Array.from(docIds).map((id: string) => ({ documentId: id, documentName: '', score: 0 })), topScopes: [], topTopics: [] };
}