import { signToken } from '../../lib/service/auth/jwt';
import type { DocumentQueryService } from '../../src/application/documents/document-query.service';
import type { DocumentUploadService } from '../../src/application/documents/document-upload.service';
import { createApp } from '../../src/app';
import { createDocumentRouter } from '../../src/http/routes/document.routes';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-secret';
});

const adminToken = signToken({ userId: 1, username: 'admin', role: 'admin' });
const userToken = signToken({ userId: 2, username: 'alice', role: 'user' });

function createQueryService(): DocumentQueryService {
  return {
    list: vi.fn().mockResolvedValue({
      items: [{ id: 1, name: 'handbook.txt', contentType: 'text/plain', size: 3, status: 'PARSING' }],
      page: 1,
      pageSize: 10,
      total: 1,
    }),
    get: vi.fn().mockResolvedValue({ id: 1, name: 'handbook.txt', contentType: 'text/plain', size: 3, status: 'PARSING' }),
  };
}

function createUploadService(): DocumentUploadService {
  return {
    upload: vi.fn().mockResolvedValue({
      documentId: 1,
      taskId: 2,
      documentName: 'handbook.txt',
      parseStatus: 2,
      strategyStatus: 1,
      indexStatus: 1,
    }),
  };
}

function createTestApp(queryService = createQueryService(), uploadService = createUploadService()) {
  return createApp({ featureRouters: [createDocumentRouter({ queryService, uploadService, maxUploadBytes: 20 })] });
}

describe('document routes', () => {
  it('requires an administrator for every document route', async () => {
    const app = createTestApp();
    const paths = [
      request(app).get('/api/manage/documents'),
      request(app).get('/api/manage/documents/1'),
      request(app).post('/api/manage/documents').attach('file', Buffer.from('abc'), 'handbook.txt'),
    ];

    for (const call of paths) {
      const response = await call.set('Authorization', `Bearer ${userToken}`);
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ADMIN_REQUIRED');
    }
  });

  it('lists documents with default pagination and an empty keyword', async () => {
    const queryService = createQueryService();
    const response = await request(createTestApp(queryService))
      .get('/api/manage/documents?keyword=')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [{ id: 1, name: 'handbook.txt', contentType: 'text/plain', size: 3, status: 'PARSING' }],
      page: 1,
      pageSize: 10,
      total: 1,
    });
    expect(queryService.list).toHaveBeenCalledWith({ page: 1, pageSize: 10, keyword: '' });
  });

  it('accepts omitted keyword with default pagination', async () => {
    const queryService = createQueryService();
    const response = await request(createTestApp(queryService))
      .get('/api/manage/documents')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(queryService.list).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  it('returns 404 for an absent document', async () => {
    const queryService = createQueryService();
    (queryService.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const response = await request(createTestApp(queryService))
      .get('/api/manage/documents/999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DOCUMENT_NOT_FOUND');
  });

  it('requires the multipart field to be named file', async () => {
    const uploadService = createUploadService();
    const response = await request(createTestApp(createQueryService(), uploadService))
      .post('/api/manage/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('attachment', Buffer.from('abc'), 'handbook.txt');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(uploadService.upload).not.toHaveBeenCalled();
  });

  it('accepts an uploaded document and returns task statuses', async () => {
    const uploadService = createUploadService();
    const response = await request(createTestApp(createQueryService(), uploadService))
      .post('/api/manage/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('abc'), { filename: 'handbook.txt', contentType: 'text/plain' });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      documentId: 1,
      taskId: 2,
      documentName: 'handbook.txt',
      parseStatus: 2,
      strategyStatus: 1,
      indexStatus: 1,
    });
  });
});
