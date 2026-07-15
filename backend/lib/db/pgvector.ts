import { config } from '../config';
import { Pool } from 'pg';



let _pool: Pool | null = null;
export function getPgVectorPool(): Pool {
    if (_pool === null) {
        _pool = new Pool({
            host: config.pgvector.host,
            port: config.pgvector.port,
            database: config.pgvector.database,
            user: config.pgvector.user,
            password: config.pgvector.password,
            max: config.pgvector.maxPoolSize,
        })
    }
    return _pool;
}

// PGVector向量相似度搜索：使用余弦距离(<=>)操作符，1-distance得到余弦相似度
// minSim=0.45 过滤掉相似度过低的结果，避免引入噪音；topK=8 返回最相似的8条记录
export async function vectorSearch(embedding: number[], topK: number = 8, minSim: number = 0.45) {
    const v = `[${embedding.join(',')}]`;
    const r = await getPgVectorPool().query(`SELECT dc."documentId",dc."chunkId",dc."chunkContent" as content, 1-(dc."vectorEmbedding"<=>$1::vector) 
        as sim FROM document_chunk dc WHERE 1-(dc."vectorEmbedding"<=>$1::vector)>$2 ORDER BY sim DESC LIMIT $3`, [v, minSim, topK]);
    return r.rows.map((row: any) => {
        return {
            documentId: row.documentId,
            chunkId: row.chunkId,
            content: row.content,
            similarity: parseFloat(row.sim),
        }
    })
}