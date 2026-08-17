import { describe, expect, it } from 'vitest';
import { createSessionService, type SessionRepository } from '../../src/application/sessions/session.service';

describe('session service', () => {
  it('prevents a non-admin from reading another user session', async () => {
    const service = createSessionService({
      getSession: async () => ({ conversationId: 'c1', userId: 8 }),
    });

    await expect(service.getExchanges({
      conversationId: 'c1',
      limit: 20,
      user: { userId: 7, username: 'alice', role: 'user' },
    })).rejects.toMatchObject({ code: 'SESSION_FORBIDDEN', statusCode: 403 });
  });

  it('treats legacy ownerless sessions as admin-only', async () => {
    const service = createSessionService({
      getSession: async () => ({ conversationId: 'c1', userId: undefined }),
    });

    await expect(service.getSummary({
      conversationId: 'c1',
      user: { userId: 7, username: 'alice', role: 'user' },
    })).rejects.toMatchObject({ code: 'SESSION_FORBIDDEN', statusCode: 403 });
  });

  it('returns not found when a requested session does not exist', async () => {
    const service = createSessionService({ getSession: async () => null });

    await expect(service.getSummary({
      conversationId: 'c1',
      user: { userId: 7, username: 'alice', role: 'user' },
    })).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND', statusCode: 404 });
  });

  it('returns the shared empty summary when an existing session has no summary', async () => {
    const service = createSessionService({
      getSession: async () => ({ conversationId: 'c1', userId: 7 }),
      getLatestSummary: async () => null,
    });

    await expect(service.getSummary({
      conversationId: 'c1',
      user: { userId: 7, username: 'alice', role: 'user' },
    })).resolves.toEqual({
      conversationId: 'c1',
      coveredExchangeId: 0,
      compressionCount: 0,
      conversationGoal: '',
      summary: '',
      stableFacts: [],
      pendingQuestions: [],
      retrievalHints: [],
      resolvedPoints: [],
      tokenUsed: 0,
    });
  });

  it('includes all owners when an admin lists sessions', async () => {
    const listSessions = async (input: {
      keyword?: string; pageNo: number; pageSize: number; userId?: number; includeAllUsers?: boolean;
    }) => {
      expect(input).toEqual({ pageNo: 1, pageSize: 10, includeAllUsers: true });
      return { sessions: [], total: 0 };
    };
    const service = createSessionService({ listSessions });

    await service.listSessions({
      page: 1, pageSize: 10, user: { userId: 1, username: 'admin', role: 'admin' },
    });
  });

  it('serializes dates and bigint values from the repository', async () => {
    const repository: SessionRepository = {
      listSessions: async () => ({
        sessions: [{
          conversationId: 'c1', chatMode: 'OPEN_CHAT', status: 0, title: 'Hello', exchangeCount: 2,
          createTime: new Date('2026-08-17T00:00:00.000Z'), editTime: new Date('2026-08-17T01:00:00.000Z'),
        }],
        total: BigInt(1),
      }),
    };
    const service = createSessionService(repository);

    await expect(service.listSessions({
      page: 1, pageSize: 10, user: { userId: 7, username: 'alice', role: 'admin' },
    })).resolves.toEqual({
      items: [{
        conversationId: 'c1', chatMode: 'OPEN_CHAT', status: 0, title: 'Hello',
        createdAt: '2026-08-17T00:00:00.000Z', updatedAt: '2026-08-17T01:00:00.000Z',
      }],
      page: 1, pageSize: 10, total: 1,
    });
  });
});
