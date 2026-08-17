import type { RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { type SessionService } from '../../src/application/sessions/session.service';
import { createSessionRouter } from '../../src/http/routes/session.routes';

const user = { userId: 7, username: 'alice', role: 'user' };
const conversationId = '8e928b74-7f80-4eb0-9484-3f93460976bb';

function createTestApp(sessionService: SessionService, requireAuth?: RequestHandler) {
  return createApp({ featureRouters: [createSessionRouter({ sessionService, requireAuth })] });
}

function createService(): SessionService {
  return {
    listSessions: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0 }),
    getExchanges: vi.fn().mockResolvedValue([]),
    getSummary: vi.fn().mockResolvedValue({
      conversationId, coveredExchangeId: 0, compressionCount: 0, conversationGoal: '', summary: '',
      stableFacts: [], pendingQuestions: [], retrievalHints: [], resolvedPoints: [], tokenUsed: 0,
    }),
    renameSession: vi.fn().mockResolvedValue(undefined),
    resetSession: vi.fn().mockResolvedValue({ deletedExchangeCount: 2 }),
    deleteSession: vi.fn().mockResolvedValue(undefined),
  };
}

const fakeRequireAuth: RequestHandler = (_req, res, next) => {
  res.locals.user = user;
  next();
};

describe('session routes', () => {
  it('rejects missing authentication', async () => {
    const response = await request(createTestApp(createService())).get('/api/chat/sessions?page=1&pageSize=10');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('lists the authenticated user sessions', async () => {
    const service = createService();
    const response = await request(createTestApp(service, fakeRequireAuth))
      .get('/api/chat/sessions?page=1&pageSize=10');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [], page: 1, pageSize: 10, total: 0 });
    expect(service.listSessions).toHaveBeenCalledWith({ page: 1, pageSize: 10, keyword: undefined, user });
  });

  it('rejects invalid session UUIDs', async () => {
    const response = await request(createTestApp(createService(), fakeRequireAuth))
      .get('/api/chat/sessions/not-a-uuid/exchanges?limit=50');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns exchanges for a valid session', async () => {
    const service = createService();
    const response = await request(createTestApp(service, fakeRequireAuth))
      .get(`/api/chat/sessions/${conversationId}/exchanges?limit=50`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
    expect(service.getExchanges).toHaveBeenCalledWith({ conversationId, limit: 50, user });
  });

  it('returns a session memory summary', async () => {
    const response = await request(createTestApp(createService(), fakeRequireAuth))
      .get(`/api/chat/sessions/${conversationId}/summary`);

    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({ conversationId, summary: '' });
  });

  it('rejects an empty session title', async () => {
    const service = createService();
    const response = await request(createTestApp(service, fakeRequireAuth))
      .patch(`/api/chat/sessions/${conversationId}`).send({ title: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(service.renameSession).not.toHaveBeenCalled();
  });

  it('renames a session', async () => {
    const service = createService();
    const response = await request(createTestApp(service, fakeRequireAuth))
      .patch(`/api/chat/sessions/${conversationId}`).send({ title: 'Renamed' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ conversationId, title: 'Renamed' });
    expect(service.renameSession).toHaveBeenCalledWith({ conversationId, title: 'Renamed', user });
  });

  it('resets a session', async () => {
    const response = await request(createTestApp(createService(), fakeRequireAuth))
      .post(`/api/chat/sessions/${conversationId}/reset`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ conversationId, deletedExchangeCount: 2 });
  });

  it('deletes a session', async () => {
    const response = await request(createTestApp(createService(), fakeRequireAuth))
      .delete(`/api/chat/sessions/${conversationId}`);

    expect(response.status).toBe(204);
  });
});
