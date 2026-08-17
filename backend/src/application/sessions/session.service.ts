import { ExchangeSchema, MemorySummarySchema, SessionPageSchema } from '@next-ai/contracts';
import { AppError } from '../../http/errors/app-error';
import type { AuthenticatedUser } from '../../http/middleware/auth';

export interface SessionRecord {
  conversationId: string;
  userId?: number;
  chatMode?: string;
  status?: number;
  title?: string;
  exchangeCount?: number;
  createTime?: Date | string;
  editTime?: Date | string;
}

export interface SessionSummary {
  conversationId: string;
  coveredExchangeId: number;
  compressionCount: number;
  conversationGoal: string;
  summary: string;
  stableFacts: string[];
  pendingQuestions: string[];
  retrievalHints: string[];
  resolvedPoints: string[];
  tokenUsed: number;
}

export interface SessionRepository {
  listSessions?(input: { keyword?: string; pageNo: number; pageSize: number; userId?: number; includeAllUsers?: boolean }): Promise<{ sessions: SessionRecord[]; total: number | bigint }>;
  getSession?(conversationId: string): Promise<SessionRecord | null>;
  getRecentExchanges?(conversationId: string, limit: number): Promise<Array<Record<string, unknown>>>;
  renameSession?(input: { conversationId: string; title: string }): Promise<void>;
  resetSession?(input: { conversationId: string }): Promise<number>;
  deleteSession?(input: { conversationId: string }): Promise<void>;
  getLatestSummary?(conversationId: string): Promise<SessionSummary | null>;
}

type ConversationRepository = Required<Omit<SessionRepository, 'getLatestSummary'>>;

async function withConversationRepository<T>(operation: (repository: ConversationRepository) => Promise<T>): Promise<T> {
  const { conversationManager } = await import('../../../lib/service/chat/ConversationManager');
  return operation({
    listSessions: (input) => conversationManager.listSessions(input),
    getSession: (conversationId) => conversationManager.getSession(conversationId),
    getRecentExchanges: (conversationId, limit) => conversationManager.getRecentExchanges(conversationId, limit),
    renameSession: (input) => conversationManager.renameSession(input),
    resetSession: (input) => conversationManager.resetSession(input),
    deleteSession: (input) => conversationManager.deleteSession(input),
  });
}

export interface SessionService {
  listSessions(input: { page: number; pageSize: number; keyword?: string; user: AuthenticatedUser }): Promise<{ items: Array<Record<string, unknown>>; page: number; pageSize: number; total: number }>;
  getExchanges(input: { conversationId: string; limit: number; user: AuthenticatedUser }): Promise<Array<Record<string, unknown>>>;
  getSummary(input: { conversationId: string; user: AuthenticatedUser }): Promise<SessionSummary>;
  renameSession(input: { conversationId: string; title: string; user: AuthenticatedUser }): Promise<void>;
  resetSession(input: { conversationId: string; user: AuthenticatedUser }): Promise<{ deletedExchangeCount: number }>;
  deleteSession(input: { conversationId: string; user: AuthenticatedUser }): Promise<void>;
}

function required<T>(value: T | undefined, name: string): T {
  if (!value) throw new Error(`Session repository is missing ${name}`);
  return value;
}

function serializeDate(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function emptySummary(conversationId: string): SessionSummary {
  return {
    conversationId,
    coveredExchangeId: 0,
    compressionCount: 0,
    conversationGoal: '',
    summary: '',
    stableFacts: [],
    pendingQuestions: [],
    retrievalHints: [],
    resolvedPoints: [],
    tokenUsed: 0,
  };
}

export function createSessionService(repository: SessionRepository): SessionService {
  async function assertAccess(conversationId: string, user: AuthenticatedUser): Promise<SessionRecord> {
    const session = await required(repository.getSession, 'getSession')(conversationId);
    if (!session) {
      throw new AppError('SESSION_NOT_FOUND', 'Session not found', 404);
    }
    if (user.role !== 'admin' && session.userId !== user.userId) {
      throw new AppError('SESSION_FORBIDDEN', 'You do not have access to this session', 403);
    }
    return session;
  }

  return {
    async listSessions({ page, pageSize, keyword, user }) {
      const result = await required(repository.listSessions, 'listSessions')({
        keyword,
        pageNo: page,
        pageSize,
        ...(user.role === 'admin' ? { includeAllUsers: true } : { userId: user.userId }),
      });
      const sessionPage = SessionPageSchema.parse({
        items: result.sessions.map((session) => ({
          conversationId: session.conversationId,
          chatMode: session.chatMode,
          status: session.status,
          title: session.title,
          createdAt: serializeDate(session.createTime),
          updatedAt: serializeDate(session.editTime),
        })),
        page,
        pageSize,
        total: Number(result.total),
      });
      return {
        ...sessionPage,
        items: sessionPage.items.map((session) => ({
          ...session,
          createdAt: session.createdAt?.toISOString(),
          updatedAt: session.updatedAt?.toISOString(),
        })),
      };
    },

    async getExchanges({ conversationId, limit, user }) {
      await assertAccess(conversationId, user);
      const exchanges = await required(repository.getRecentExchanges, 'getRecentExchanges')(conversationId, limit);
      return exchanges.map(({ createTime, ...exchange }) => {
        const mapped = ExchangeSchema.parse({
          ...exchange,
          createdAt: serializeDate(createTime as Date | string | undefined),
        });
        return { ...mapped, createdAt: mapped.createdAt?.toISOString() };
      });
    },

    async getSummary({ conversationId, user }) {
      await assertAccess(conversationId, user);
      return MemorySummarySchema.parse(
        (await required(repository.getLatestSummary, 'getLatestSummary')(conversationId)) ?? emptySummary(conversationId),
      );
    },

    async renameSession({ conversationId, title, user }) {
      await assertAccess(conversationId, user);
      await required(repository.renameSession, 'renameSession')({ conversationId, title });
    },

    async resetSession({ conversationId, user }) {
      await assertAccess(conversationId, user);
      const deletedExchangeCount = await required(repository.resetSession, 'resetSession')({ conversationId });
      return { deletedExchangeCount };
    },

    async deleteSession({ conversationId, user }) {
      await assertAccess(conversationId, user);
      await required(repository.deleteSession, 'deleteSession')({ conversationId });
    },
  };
}

export const sessionService: SessionService = {
  listSessions: (input) => withConversationRepository((repository) => createSessionService(repository).listSessions(input)),
  getExchanges: (input) => withConversationRepository((repository) => createSessionService(repository).getExchanges(input)),
  async getSummary(input) {
    const [{ memoryStore }, repository] = await Promise.all([
      import('../../../lib/service/memory/memoryStore'),
      withConversationRepository(async (value) => value),
    ]);
    return createSessionService({
      ...repository,
      getLatestSummary: (conversationId) => memoryStore.getLatestSummary(conversationId),
    }).getSummary(input);
  },
  renameSession: (input) => withConversationRepository((repository) => createSessionService(repository).renameSession(input)),
  resetSession: (input) => withConversationRepository((repository) => createSessionService(repository).resetSession(input)),
  deleteSession: (input) => withConversationRepository((repository) => createSessionService(repository).deleteSession(input)),
};
