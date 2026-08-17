import { DocumentUploadResponseSchema, type DocumentUploadResponse } from '@next-ai/contracts';
import { FileTypeMap, detectFormat } from '../../../lib/service/document/parserService';
import { AppError } from '../../http/errors/app-error';

export interface UploadInput {
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface DocumentUploadDependencies {
  maxUploadBytes: number;
  uploadFile(buffer: Buffer, fileName: string, mimeType: string): Promise<string>;
  createDocument(input: { documentName: string; fileType: number; fileSize: number; objectName: string }): Promise<{ id: number; documentName: string }>;
  createTask(documentId: number): Promise<{ id: number }>;
  publishParse(documentId: number, taskId: number, objectName: string): Promise<void>;
  deleteTask(taskId: number): Promise<void>;
  deleteDocument(documentId: number): Promise<void>;
  deleteFile(objectName: string): Promise<void>;
  logger?: Pick<Console, 'error'>;
}

export interface DocumentUploadService {
  upload(input: UploadInput): Promise<DocumentUploadResponse>;
}

function badRequest(message: string): AppError {
  return new AppError('BAD_REQUEST', message, 400);
}

function validateUpload(input: UploadInput, maxUploadBytes: number): number {
  if (!input.originalName.trim()) throw badRequest('A file name is required');
  if (input.size <= 0 || input.buffer.length <= 0) throw badRequest('Uploaded file must not be empty');
  if (input.size > maxUploadBytes || input.buffer.length > maxUploadBytes) {
    throw badRequest(`Uploaded file exceeds the ${maxUploadBytes} byte limit`);
  }
  try {
    return FileTypeMap[detectFormat(input.originalName)];
  } catch {
    throw badRequest('Unsupported document format');
  }
}

export function createDocumentUploadService(dependencies: DocumentUploadDependencies): DocumentUploadService {
  const logger = dependencies.logger ?? console;

  return {
    async upload(input) {
      const fileType = validateUpload(input, dependencies.maxUploadBytes);
      const objectName = await dependencies.uploadFile(input.buffer, input.originalName, input.mimeType);
      let documentId: number | undefined;
      let taskId: number | undefined;

      const compensate = async () => {
        const compensations: Array<[string, () => Promise<void>]> = [];
        if (taskId !== undefined) {
          const createdTaskId = taskId;
          compensations.push(['task', () => dependencies.deleteTask(createdTaskId)]);
        }
        if (documentId !== undefined) {
          const createdDocumentId = documentId;
          compensations.push(['document', () => dependencies.deleteDocument(createdDocumentId)]);
        }
        compensations.push(['object', () => dependencies.deleteFile(objectName)]);
        for (const [resource, cleanup] of compensations) {
          try {
            await cleanup();
          } catch (compensationError) {
            logger.error(`Document upload compensation failed for ${resource}`, compensationError);
          }
        }
      };

      try {
        const document = await dependencies.createDocument({
          documentName: input.originalName,
          fileType,
          fileSize: input.size,
          objectName,
        });
        documentId = document.id;
        const task = await dependencies.createTask(document.id);
        taskId = task.id;
      } catch (error) {
        await compensate();
        throw error;
      }

      try {
        await dependencies.publishParse(documentId, taskId, objectName);
      } catch {
        await compensate();
        throw new AppError('DOCUMENT_QUEUE_UNAVAILABLE', 'Document queue is unavailable', 503);
      }

      return DocumentUploadResponseSchema.parse({
        documentId,
        taskId,
        documentName: input.originalName,
        parseStatus: 2,
        strategyStatus: 1,
        indexStatus: 1,
      });
    },
  };
}

async function withDocumentUploadDependencies<T>(operation: (dependencies: DocumentUploadDependencies) => Promise<T>): Promise<T> {
  const [
    { documentRepository },
    { uploadFile, deleteFile },
    { producerService },
    { getKnowledgePrisma },
    { runtimeConfig },
  ] = await Promise.all([
    import('../../../lib/service/document/documentRepository'),
    import('../../../lib/service/document/storageService'),
    import('../../../lib/services/document/ProducerService'),
    import('../../../lib/db/prisma-knowledge'),
    import('../../config/runtime'),
  ]);
  const prisma = getKnowledgePrisma();

  return operation({
    maxUploadBytes: runtimeConfig.maxUploadBytes,
    uploadFile,
    createDocument: (input) => documentRepository.create(input),
    createTask: async (documentId) => {
      await prisma.superAgentDocument.update({
        where: { id: documentId },
        data: { parseStatus: 2, strategyStatus: 1, indexStatus: 1 },
      });
      return prisma.documentTask.create({
        data: {
          documentId,
          planId: 0,
          taskType: 1,
          taskStatus: 0,
          currentStage: 0,
          triggerSource: 1,
          extJson: '{}',
        },
      });
    },
    publishParse: (documentId, taskId, objectName) => producerService.sendParseRoute(documentId, taskId, objectName),
    deleteTask: async (taskId) => { await prisma.documentTask.delete({ where: { id: taskId } }); },
    deleteDocument: (documentId) => documentRepository.delete(documentId),
    deleteFile,
  });
}

export const documentUploadService: DocumentUploadService = {
  upload: (input) => withDocumentUploadDependencies((dependencies) => createDocumentUploadService(dependencies).upload(input)),
};
