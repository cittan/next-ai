import { Client } from '@elastic/elasticsearch';
import { config } from '../config';

let _c: Client | null = null;
export function getEsClient() {
    if(!_c) {
        _c = new Client({
            node: config.elasticsearch.uris[0],
            auth: config.elasticsearch.username ? {
                username: config.elasticsearch.username,
                password: config.elasticsearch.password,
            } : undefined,
        })
    };
    return _c;
}


export async function keywordSearch(query: string, topK: number = 8) {
    const client = getEsClient();
    const res = await client.search({
        index: config.elasticsearch.indexName,
        size: topK,
        query: {
            multi_match: {
                query: query,
                fields: ['chunkContent', 'sectionPath^2', 'documentName^3'],
            }
        }
    });
    return res.hits.hits.map((h: any) => ({ documentId: h._source.documentId, chunkId: h._source.chunkId, content: h._source.chunkContent, score: h._score || 0 }));
}

