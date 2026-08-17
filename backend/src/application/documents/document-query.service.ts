import { DocumentPageSchema, DocumentSchema, type Document, type DocumentPage } from '@next-ai/contracts';

export interface DocumentRecord {
  id: number;
  documentName: string;
  originalFileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | bigint | null;
  knowledgeScopeCode?: string | null;
  parseStatus?: number;
  createTime?: Date | string;
  updateTime?: Date | string;
}

export interface DocumentQueryRepository {
  list(input: { keyword?: string; pageNo: number; pageSize: number }): Promise<{ total: number | bigint; rows: DocumentRecord[] }>;
  findById(documentId: number): Promise<DocumentRecord | null>;
}

export interface DocumentQueryService {
  list(input: { page: number; pageSize: number; keyword?: string }): Promise<DocumentPage>;
  get(documentId: number): Promise<Document | null>;
}

function status(parseStatus: number | undefined): string {
  if (parseStatus === 3) return 'PARSED';
  if (parseStatus === 4) return 'FAILED';
  return 'PARSING';
}

function toDocument(record: DocumentRecord): Document {
  return DocumentSchema.parse({
    id: record.id,
    name: record.documentName,
    fileName: record.originalFileName ?? record.documentName,
    contentType: record.mimeType ?? undefined,
    size: record.fileSize === null || record.fileSize === undefined ? undefined : Number(record.fileSize),
    scopeCode: record.knowledgeScopeCode ?? undefined,
    status: status(record.parseStatus),
    createdAt: record.createTime,
    updatedAt: record.updateTime,
  });
}

export function createDocumentQueryService(repository: DocumentQueryRepository): DocumentQueryService {
  return {
    async list(input) {
      const result = await repository.list({ keyword: input.keyword, pageNo: input.page, pageSize: input.pageSize });
      const parsed = DocumentPageSchema.parse({
        items: result.rows.map(toDocument),
        page: input.page,
        pageSize: input.pageSize,
        total: Number(result.total),
      });
      return parsed;
    },
    async get(documentId) {
      const record = await repository.findById(documentId);
      return record ? toDocument(record) : null;
    },
  };
}

async function withDocumentRepository<T>(operation: (repository: DocumentQueryRepository) => Promise<T>): Promise<T> {
  const { documentRepository } = await import('../../../lib/service/document/documentRepository');
  return operation(documentRepository);
}

export const documentQueryService: DocumentQueryService = {
  list: (input) => withDocumentRepository((repository) => createDocumentQueryService(repository).list(input)),
  get: (documentId) => withDocumentRepository((repository) => createDocumentQueryService(repository).get(documentId)),
};
