import { describe, expect, it, vi } from 'vitest';
import { buildObjectName } from '../../lib/service/document/storageService';
import { createDocumentUploadService } from '../../src/application/documents/document-upload.service';

describe('document upload service', () => {
  it('normalizes a trailing object prefix slash for deterministic deletion', () => {
    expect(buildObjectName('documents/', 'file.txt', 123)).toBe('documents/123_file.txt');
    expect(buildObjectName('documents', 'file.txt', 123)).toBe('documents/123_file.txt');
  });

  it('removes database rows and the uploaded object when Kafka publish fails', async () => {
    const events: string[] = [];
    const service = createDocumentUploadService({
      maxUploadBytes: 20,
      uploadFile: async () => { events.push('upload'); return 'it/file.txt'; },
      createDocument: async () => { events.push('document'); return { id: 11, documentName: 'file.txt' }; },
      createTask: async () => { events.push('task'); return { id: 22 }; },
      publishParse: async () => { throw new Error('kafka unavailable'); },
      deleteTask: async () => { events.push('delete-task'); },
      deleteDocument: async () => { events.push('delete-document'); },
      deleteFile: async () => { events.push('delete-file'); },
    });

    await expect(service.upload({
      originalName: 'file.txt',
      mimeType: 'text/plain',
      size: 3,
      buffer: Buffer.from('abc'),
    })).rejects.toMatchObject({ code: 'DOCUMENT_QUEUE_UNAVAILABLE', statusCode: 503 });

    expect(events).toEqual([
      'upload', 'document', 'task', 'delete-task', 'delete-document', 'delete-file',
    ]);
  });

  it('attempts every compensation and preserves the queue error', async () => {
    const logger = { error: vi.fn() };
    const service = createDocumentUploadService({
      maxUploadBytes: 20,
      uploadFile: async () => 'it/file.txt',
      createDocument: async () => ({ id: 11, documentName: 'file.txt' }),
      createTask: async () => ({ id: 22 }),
      publishParse: async () => { throw new Error('kafka unavailable'); },
      deleteTask: async () => { throw new Error('task cleanup failed'); },
      deleteDocument: async () => { throw new Error('document cleanup failed'); },
      deleteFile: async () => { throw new Error('object cleanup failed'); },
      logger,
    });

    await expect(service.upload({
      originalName: 'file.txt', mimeType: 'text/plain', size: 3, buffer: Buffer.from('abc'),
    })).rejects.toMatchObject({ code: 'DOCUMENT_QUEUE_UNAVAILABLE', statusCode: 503 });

    expect(logger.error).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['unsupported extension', { originalName: 'file.exe', size: 3 }],
    ['zero-byte file', { originalName: 'file.txt', size: 0 }],
    ['oversized file', { originalName: 'file.txt', size: 21 }],
  ])('rejects a %s before uploading to MinIO', async (_name, file) => {
    const uploadFile = vi.fn();
    const service = createDocumentUploadService({
      maxUploadBytes: 20,
      uploadFile,
      createDocument: vi.fn(),
      createTask: vi.fn(),
      publishParse: vi.fn(),
      deleteTask: vi.fn(),
      deleteDocument: vi.fn(),
      deleteFile: vi.fn(),
    });

    await expect(service.upload({
      mimeType: 'text/plain', buffer: Buffer.alloc(file.size), ...file,
    })).rejects.toMatchObject({ code: 'BAD_REQUEST', statusCode: 400 });
    expect(uploadFile).not.toHaveBeenCalled();
  });
});
