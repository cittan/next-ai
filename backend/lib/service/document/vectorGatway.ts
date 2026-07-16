import { embedTexts } from "@/lib/ai/embedding";
import { getPgVectorPool } from "@/lib/db/pgvector";

//向量化文档块
export async function vectorizeChunks(chunks: { documentId: number; chunkId: number; content: string }[]): Promise<void> {
    const pool = getPgVectorPool();
    const text = chunks.map(chunk => chunk.content);
    const embeddings = await embedTexts(text);
    const client = await pool.connect();
    try{
        await client.query('BEGIN');
        for(let i = 0;i<chunks.length;i++){
            await client.query(`UPDATE document_chunk SET embedding=$1::vector, vector_status=2 WHERE document_id=$2 AND chunk_id=$3`, [`[${embeddings[i].join(',')}]`, chunks[i].documentId, chunks[i].chunkId]);
        }
        await client.query('COMMIT');
    }catch(err){
        await client.query('ROLLBACK');
        throw err;
    }
    finally{
        client.release();
    }
}