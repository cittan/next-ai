import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/http/errors/app-error';
import { createDocumentLifecycleService } from '../../src/application/documents/document-lifecycle.service';

describe('document lifecycle service', () => {
  it('deletes indexes, stored objects, and database data', async () => {
    const calls: string[] = [];
    const service = createDocumentLifecycleService({
      findDocument: async () => ({ id: 7, objectName: 'raw/a.txt', parseTextPath: 'parsed/a.txt' }),
      deleteKeywordIndex: async () => { calls.push('es'); },
      deleteVectors: async () => { calls.push('vector'); },
      deleteFile: async (path) => { calls.push(`file:${path}`); },
      deleteDatabaseRecords: async () => { calls.push('db'); },
      createIndexTask: vi.fn(),
      buildIndex: vi.fn(),
    });

    await service.delete(7);
    expect(calls).toEqual(['es', 'vector', 'file:raw/a.txt', 'file:parsed/a.txt', 'db']);
  });

  it('returns not found for a missing document', async () => {
    const service = createDocumentLifecycleService({
      findDocument: async () => null,
      deleteKeywordIndex: vi.fn(), deleteVectors: vi.fn(), deleteFile: vi.fn(), deleteDatabaseRecords: vi.fn(),
      createIndexTask: vi.fn(), buildIndex: vi.fn(),
    });
    await expect(service.delete(99)).rejects.toMatchObject({ code: 'DOCUMENT_NOT_FOUND', statusCode: 404 });
  });

  it('creates a task and runs the existing index processor', async () => {
    const buildIndex = vi.fn(async () => ({ parentBlockCount: 1, chunkCount: 4 }));
    const service = createDocumentLifecycleService({
      findDocument: async () => ({ id: 7, objectName: 'raw/a.txt', parseTextPath: 'parsed/a.txt', currentPlanId: 3 }),
      deleteKeywordIndex: vi.fn(), deleteVectors: vi.fn(), deleteFile: vi.fn(), deleteDatabaseRecords: vi.fn(),
      createIndexTask: async () => ({ id: 12 }), buildIndex,
    });

    await expect(service.build(7)).resolves.toEqual({ taskId: 12, indexedChunks: 4, parentBlocks: 1 });
    expect(buildIndex).toHaveBeenCalledWith(7, 12, 3);
  });
});
