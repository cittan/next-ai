import { config } from "@/lib/config";
import { getEsClient } from "@/lib/db/elasticsearch";

export async function indexChunksToEs(items: { documentId: number; documentName: string; chunkId: number; chunkContent: string; sectionPath: string }[]): Promise<void> {
    const client = await getEsClient();
    const idx = config.elasticsearch.indexName;
    // 检查索引是否存在
    const exists = await client.indices.exists({ index: idx });
    if (!exists) {
        await client.indices.create({
            index: idx,
            mappings: {
                properties: {
                    documentId: { type: "integer" },
                    chunkId: { type: "integer" },
                    documentName: { type: "text" },
                    chunkContent: { type: "text" },
                    sectionPath: { type: "text" },
                }
            }
        });
    }
    const body = items.flatMap(item => [{
        index: { _index: idx, _id: `doc_${item.documentId}_${item.chunkId}` },
    }, item]);
    if (body.length > 0) {
        //ES 的bulk的请求体格式，NDJSON，一行元数据，一行数据
        await client.bulk({ index: idx, body });
    }
}

export async function searchByKeyword(keyword: string): Promise<any[]> {
    const client = await getEsClient();
    const idx = config.elasticsearch.indexName;
    
    const result = await client.search({
        index: idx,
        body: {
            query: {
                match: {
                    chunkContent: keyword
                }
            }
        }
    });
    
    return result.hits.hits.map(hit => hit._source);
}