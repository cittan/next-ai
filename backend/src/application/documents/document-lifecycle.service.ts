import { AppError } from '../../http/errors/app-error';

export interface LifecycleDocument {
  id: number;
  objectName?: string | null;
  parseTextPath?: string | null;
  currentPlanId?: number | null;
}

export interface DocumentLifecycleDependencies {
  findDocument(documentId: number): Promise<LifecycleDocument | null>;
  deleteKeywordIndex(documentId: number): Promise<void>;
  deleteVectors(documentId: number): Promise<void>;
  deleteFile(objectName: string): Promise<void>;
  deleteDatabaseRecords(documentId: number): Promise<void>;
  createIndexTask(documentId: number, planId: number): Promise<{ id: number }>;
  buildIndex(documentId: number, taskId: number, planId: number): Promise<{ parentBlockCount: number; chunkCount: number }>;
}

export interface DocumentLifecycleService {
  delete(documentId: number): Promise<void>;
  build(documentId: number, planId?: number): Promise<{ taskId: number; indexedChunks: number; parentBlocks: number }>;
}

export function createDocumentLifecycleService(deps: DocumentLifecycleDependencies): DocumentLifecycleService {
  return {
    async delete(documentId) {
      const document = await deps.findDocument(documentId);
      if (!document) throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);

      await deps.deleteKeywordIndex(documentId);
      await deps.deleteVectors(documentId);
      if (document.objectName) await deps.deleteFile(document.objectName);
      if (document.parseTextPath && document.parseTextPath !== document.objectName) {
        await deps.deleteFile(document.parseTextPath);
      }
      await deps.deleteDatabaseRecords(documentId);
    },

    async build(documentId, requestedPlanId) {
      const document = await deps.findDocument(documentId);
      if (!document) throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
      if (!document.parseTextPath) throw new AppError('DOCUMENT_NOT_PARSED', 'Document has no parsed text', 409);
      const planId = requestedPlanId ?? document.currentPlanId;
      if (!planId) throw new AppError('DOCUMENT_PLAN_REQUIRED', 'Document has no indexing plan', 409);

      const task = await deps.createIndexTask(documentId, planId);
      const result = await deps.buildIndex(documentId, task.id, planId);
      return { taskId: task.id, indexedChunks: result.chunkCount, parentBlocks: result.parentBlockCount };
    },
  };
}

async function productionDependencies(): Promise<DocumentLifecycleDependencies> {
  const [{ documentRepository }, { getKnowledgePrisma }, { getEsClient }, { getPgVectorPool }, { deleteFile }, { indexingProcessor }, { config }] = await Promise.all([
    import('../../../lib/service/document/documentRepository'),
    import('../../../lib/db/prisma-knowledge'),
    import('../../../lib/db/elasticsearch'),
    import('../../../lib/db/pgvector'),
    import('../../../lib/service/document/storageService'),
    import('../../../lib/services/document/IndexingProcessor'),
    import('../../../lib/config'),
  ]);
  const prisma = getKnowledgePrisma();

  return {
    findDocument: (documentId) => documentRepository.findById(documentId),
    deleteKeywordIndex: async (documentId) => {
      const client = getEsClient();
      const exists = await client.indices.exists({ index: config.elasticsearch.indexName });
      if (exists) await client.deleteByQuery({ index: config.elasticsearch.indexName, query: { term: { documentId } }, refresh: true });
    },
    deleteVectors: async (documentId) => {
      await getPgVectorPool().query('DELETE FROM document_chunk WHERE document_id = $1', [documentId]);
    },
    deleteFile,
    deleteDatabaseRecords: async (documentId) => {
      await prisma.$transaction(async (tx) => {
        await tx.documentChunkBusiness.deleteMany({ where: { documentId } });
        await tx.documentParentBlock.deleteMany({ where: { documentId } });
        await tx.documentStructureNode.deleteMany({ where: { documentId } });
        await tx.documentTask.deleteMany({ where: { documentId } });
        await tx.documentStrategyStep.deleteMany({ where: { documentId } });
        await tx.documentStrategyPlan.deleteMany({ where: { documentId } });
        await tx.documentChunk.deleteMany({ where: { documentId } });
        await tx.superAgentDocument.delete({ where: { id: documentId } });
      });
    },
    createIndexTask: async (documentId, planId) => {
      await prisma.superAgentDocument.update({ where: { id: documentId }, data: { indexStatus: 2 } });
      return prisma.documentTask.create({
        data: { documentId, planId, taskType: 2, taskStatus: 1, currentStage: 1, triggerSource: 2, startTime: new Date() },
      });
    },
    buildIndex: async (documentId, taskId, planId) => {
      try {
        const result = await indexingProcessor.buildIndex(documentId, taskId, planId);
        await prisma.documentTask.update({ where: { id: taskId }, data: { taskStatus: 2, currentStage: 2, finishTime: new Date() } });
        return result;
      } catch (error) {
        await prisma.documentTask.update({ where: { id: taskId }, data: { taskStatus: 3, finishTime: new Date(), errorMsg: error instanceof Error ? error.message : String(error) } });
        await prisma.superAgentDocument.update({ where: { id: documentId }, data: { indexStatus: 4 } });
        throw error;
      }
    },
  };
}

export const documentLifecycleService: DocumentLifecycleService = {
  delete: async (documentId) => createDocumentLifecycleService(await productionDependencies()).delete(documentId),
  build: async (documentId, planId) => createDocumentLifecycleService(await productionDependencies()).build(documentId, planId),
};
