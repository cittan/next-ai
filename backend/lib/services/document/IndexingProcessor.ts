import { getKnowledgePrisma } from '../../db/prisma-knowledge';
import { downloadFromMinio } from '../../db/minio';
import { splitTextBySemantic } from '../../ai/embedding';
import { estimateTokens } from '../../ai/client';
import { vectorizeChunks } from '../../service/document/vectorGatway';
import { indexChunksToEs } from '../../service/document/keywordService';

export class IndexingProcessor {
  private get prisma() {
    return getKnowledgePrisma();
  }

  /**
   * 执行索引构建：分块 → 向量化 → 写入 pgvector + ES
   */
  async buildIndex(
    documentId: number,
    taskId: number,
    planId: number,
  ): Promise<{ parentBlockCount: number; chunkCount: number }> {
    const prisma = this.prisma;

    // 1. 获取文档和策略方案
    const doc = await prisma.superAgentDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || !doc.parseTextPath) {
      throw new Error(`文档 ${documentId} 未解析或解析文本路径为空`);
    }

    const plan = await prisma.documentStrategyPlan.findUnique({
      where: { id: planId },
      include: { steps: { orderBy: { stepNo: 'asc' } } },
    });
    if (!plan) {
      throw new Error(`策略方案 ${planId} 不存在`);
    }

    // 2. 下载解析后的文本
    const parsedTextBuffer = await downloadFromMinio(doc.parseTextPath);
    const parsedText = parsedTextBuffer.toString('utf-8');

    // 3. 根据策略分块
    const chunks = await this.chunkByStrategy(parsedText, plan);

    // 4. 写入数据库和索引（内部完成向量化 + pgvector + ES）
    const result = await this.saveChunksAndVectors(
      documentId,
      taskId,
      planId,
      chunks,
    );

    // 6. 更新文档状态
    await prisma.superAgentDocument.update({
      where: { id: documentId },
      data: {
        indexStatus: 3, // 构建成功
        lastIndexTaskId: taskId,
        tokenCount: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
      },
    });

    return result;
  }

  /**
   * 根据策略方案进行分块
   */
  private async chunkByStrategy(
    text: string,
    plan: any,
  ): Promise<Array<{ text: string; sectionPath?: string; tokenCount: number }>> {
    const chunks: Array<{ text: string; sectionPath?: string; tokenCount: number }> = [];

    // 简化实现：使用递归字符切分
    // 实际应根据 plan.steps 中的策略类型选择切分方式
    const useSemantic = plan.steps.some(
      (s: any) => s.strategyType === 'SEMANTIC' || s.strategyRole === 'PRIMARY',
    );

    const textChunks = await splitTextBySemantic(text, 'txt', useSemantic);

    for (const chunkText of textChunks) {
      chunks.push({
        text: chunkText,
        tokenCount: estimateTokens(chunkText),
      });
    }

    return chunks;
  }

  /**
   * 保存分块和向量到数据库 + ES
   */
  private async saveChunksAndVectors(
    documentId: number,
    taskId: number,
    planId: number,
    chunks: Array<{ text: string; sectionPath?: string; tokenCount: number }>,
  ): Promise<{ parentBlockCount: number; chunkCount: number }> {
    const prisma = this.prisma;

    // 1. 获取文档名称（ES 索引需要）
    const doc = await prisma.superAgentDocument.findUnique({
      where: { id: documentId },
      select: { documentName: true },
    });
    const documentName = doc?.documentName || '';

    // 2. 创建父块（简化：整个文档作为一个父块）
    const parentBlock = await prisma.documentParentBlock.create({
      data: {
        documentId,
        taskId,
        planId,
        parentNo: 1,
        sourceType: 1,
        parentText: chunks.map(c => c.text).join('\n\n'),
        charCount: chunks.reduce((sum, c) => sum + c.text.length, 0),
        tokenCount: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
        childCount: chunks.length,
        startChunkNo: 1,
        endChunkNo: chunks.length,
      },
    });

    // 3. 批量创建业务分块
    await prisma.documentChunkBusiness.createMany({
      data: chunks.map((chunk, idx) => ({
        documentId,
        taskId,
        planId,
        parentBlockId: parentBlock.id,
        chunkId: idx + 1,
        sourceType: 1,
        sectionPath: chunk.sectionPath,
        chunkText: chunk.text,
        charCount: chunk.text.length,
        tokenCount: chunk.tokenCount,
        vectorStatus: 0, // 待向量化
      })),
    });

    // 4. 写入 pgvector（复用 vectorGatway 服务）
    await vectorizeChunks(
      chunks.map((chunk, idx) => ({
        documentId,
        chunkId: idx + 1,
        content: chunk.text,
      })),
    );

    // 5. 写入 Elasticsearch（复用 keywordService）
    await indexChunksToEs(
      chunks.map((chunk, idx) => ({
        documentId,
        documentName,
        chunkId: idx + 1,
        chunkContent: chunk.text,
        sectionPath: chunk.sectionPath || '',
      })),
    );

    // 6. 更新业务分块的向量化状态
    await prisma.documentChunkBusiness.updateMany({
      where: { documentId, taskId, planId },
      data: { vectorStatus: 2, vectorStoreType: 1 },
    });

    return {
      parentBlockCount: 1,
      chunkCount: chunks.length,
    };
  }
}

export const indexingProcessor = new IndexingProcessor();
