import type {
  CreateKnowledgeScope,
  CreateKnowledgeTopic,
  KnowledgeScope,
  KnowledgeTopic,
  UpdateKnowledgeScope,
  UpdateKnowledgeTopic,
} from '@next-ai/contracts';
import { AppError } from '../../http/errors/app-error';

export interface KnowledgeScopeRecord {
  scopeCode: string;
  scopeName: string;
  description: string | null;
}

export interface KnowledgeTopicRecord {
  topicCode: string;
  scopeCode: string | null;
  topicName: string;
  description: string | null;
}

export interface KnowledgeRepository {
  listScopes(): Promise<KnowledgeScopeRecord[]>;
  createScope(input: { scopeCode: string; scopeName: string; description?: string | null }): Promise<KnowledgeScopeRecord>;
  updateScope(scopeCode: string, input: { scopeName?: string; description?: string | null }): Promise<KnowledgeScopeRecord | null>;
  deleteScope(scopeCode: string): Promise<boolean>;
  findScope(scopeCode: string): Promise<KnowledgeScopeRecord | null>;
  listTopics(scopeCode?: string): Promise<KnowledgeTopicRecord[]>;
  createTopic(input: { topicCode: string; scopeCode: string; topicName: string; description?: string | null }): Promise<KnowledgeTopicRecord>;
  updateTopic(topicCode: string, input: { scopeCode?: string; topicName?: string; description?: string | null }): Promise<KnowledgeTopicRecord | null>;
  deleteTopic(topicCode: string): Promise<boolean>;
  findTopic(topicCode: string): Promise<KnowledgeTopicRecord | null>;
  withScopeLocks<T>(scopeCodes: string[], operation: (repository: KnowledgeRepository) => Promise<T>): Promise<T>;
}

export interface KnowledgeService {
  listScopes(): Promise<KnowledgeScope[]>;
  createScope(input: CreateKnowledgeScope): Promise<KnowledgeScope>;
  updateScope(scopeCode: string, input: UpdateKnowledgeScope): Promise<KnowledgeScope>;
  deleteScope(scopeCode: string): Promise<void>;
  listTopics(scopeCode?: string): Promise<KnowledgeTopic[]>;
  createTopic(input: CreateKnowledgeTopic): Promise<KnowledgeTopic>;
  updateTopic(topicCode: string, input: UpdateKnowledgeTopic): Promise<KnowledgeTopic>;
  deleteTopic(topicCode: string): Promise<void>;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function scopeNotFound(): AppError {
  return new AppError('KNOWLEDGE_SCOPE_NOT_FOUND', 'Knowledge scope not found', 404);
}

function topicNotFound(): AppError {
  return new AppError('KNOWLEDGE_TOPIC_NOT_FOUND', 'Knowledge topic not found', 404);
}

function codeExists(): AppError {
  return new AppError('KNOWLEDGE_CODE_EXISTS', 'Knowledge scope or topic code already exists', 409);
}

function scopeInUse(): AppError {
  return new AppError('KNOWLEDGE_SCOPE_IN_USE', 'Knowledge scope cannot be deleted while it has topics', 409);
}

function toScope(record: KnowledgeScopeRecord): KnowledgeScope {
  return { code: record.scopeCode, name: record.scopeName, description: record.description };
}

function toTopic(record: KnowledgeTopicRecord): KnowledgeTopic {
  if (!record.scopeCode) throw new AppError('KNOWLEDGE_SCOPE_REQUIRED', 'Knowledge topic must have a scope', 400);
  return { code: record.topicCode, scopeCode: record.scopeCode, name: record.topicName, description: record.description };
}

const UNSCOPED_TOPICS_LOCK_KEY = '__unscoped_topics__';

function sortedScopeCodes(scopeCodes: string[]): string[] {
  return [...new Set(scopeCodes)].sort((left, right) => left.localeCompare(right));
}

export function createKnowledgeService(repository: KnowledgeRepository): KnowledgeService {
  async function assertScope(scopeCode: string, transaction: KnowledgeRepository): Promise<void> {
    if (!await transaction.findScope(scopeCode)) throw scopeNotFound();
  }

  return {
    async listScopes() {
      return (await repository.listScopes()).map(toScope);
    },

    async createScope(input) {
      return repository.withScopeLocks([input.code], async (transaction) => {
        try {
          return toScope(await transaction.createScope({
            scopeCode: input.code, scopeName: input.name, description: input.description,
          }));
        } catch (error) {
          if (isPrismaError(error, 'P2002')) throw codeExists();
          throw error;
        }
      });
    },

    async updateScope(scopeCode, input) {
      return repository.withScopeLocks([scopeCode], async (transaction) => {
        await assertScope(scopeCode, transaction);
        try {
          const result = await transaction.updateScope(scopeCode, { scopeName: input.name, description: input.description });
          if (!result) throw scopeNotFound();
          return toScope(result);
        } catch (error) {
          if (isPrismaError(error, 'P2025')) throw scopeNotFound();
          throw error;
        }
      });
    },

    async deleteScope(scopeCode) {
      await repository.withScopeLocks([scopeCode], async (transaction) => {
        await assertScope(scopeCode, transaction);
        if ((await transaction.listTopics(scopeCode)).length > 0) throw scopeInUse();
        try {
          if (!await transaction.deleteScope(scopeCode)) throw scopeNotFound();
        } catch (error) {
          if (isPrismaError(error, 'P2025')) throw scopeNotFound();
          throw error;
        }
      });
    },

    async listTopics(scopeCode) {
      return (await repository.listTopics(scopeCode)).map(toTopic);
    },

    async createTopic(input) {
      return repository.withScopeLocks([input.scopeCode], async (transaction) => {
        await assertScope(input.scopeCode, transaction);
        try {
          return toTopic(await transaction.createTopic({
            topicCode: input.code, scopeCode: input.scopeCode, topicName: input.name, description: input.description,
          }));
        } catch (error) {
          if (isPrismaError(error, 'P2002')) throw codeExists();
          throw error;
        }
      });
    },

    async updateTopic(topicCode, input) {
      const existing = await repository.findTopic(topicCode);
      if (!existing) throw topicNotFound();
      if (!existing.scopeCode) throw new AppError('KNOWLEDGE_SCOPE_REQUIRED', 'Knowledge topic must have a scope', 400);
      const targetScopeCode = input.scopeCode ?? existing.scopeCode;

      return repository.withScopeLocks(sortedScopeCodes([existing.scopeCode, targetScopeCode]), async (transaction) => {
        const topic = await transaction.findTopic(topicCode);
        if (!topic) throw topicNotFound();
        await assertScope(targetScopeCode, transaction);
        try {
          const result = await transaction.updateTopic(topicCode, {
            scopeCode: input.scopeCode, topicName: input.name, description: input.description,
          });
          if (!result) throw topicNotFound();
          return toTopic(result);
        } catch (error) {
          if (isPrismaError(error, 'P2025')) throw topicNotFound();
          throw error;
        }
      });
    },

    async deleteTopic(topicCode) {
      const existing = await repository.findTopic(topicCode);
      if (!existing) throw topicNotFound();
      const lockKey = existing.scopeCode || UNSCOPED_TOPICS_LOCK_KEY;

      await repository.withScopeLocks([lockKey], async (transaction) => {
        if (!await transaction.findTopic(topicCode)) throw topicNotFound();
        try {
          if (!await transaction.deleteTopic(topicCode)) throw topicNotFound();
        } catch (error) {
          if (isPrismaError(error, 'P2025')) throw topicNotFound();
          throw error;
        }
      });
    },
  };
}

async function withKnowledgeRepository<T>(operation: (repository: KnowledgeRepository) => Promise<T>): Promise<T> {
  const { getKnowledgePrisma } = await import('../../../lib/db/prisma-knowledge');
  const prisma = getKnowledgePrisma();

  function createPrismaRepository(client: typeof prisma): KnowledgeRepository {
    return {
      listScopes: () => client.knowledgeScope.findMany({ orderBy: { sortOrder: 'asc' } }),
      createScope: (input) => client.knowledgeScope.create({ data: input }),
      updateScope: async (scopeCode, input) => {
        try { return await client.knowledgeScope.update({ where: { scopeCode }, data: input }); } catch (error) { if (isPrismaError(error, 'P2025')) return null; throw error; }
      },
      deleteScope: async (scopeCode) => {
        try { await client.knowledgeScope.delete({ where: { scopeCode } }); return true; } catch (error) { if (isPrismaError(error, 'P2025')) return false; throw error; }
      },
      findScope: (scopeCode) => client.knowledgeScope.findUnique({ where: { scopeCode } }),
      listTopics: (scopeCode) => client.knowledgeTopic.findMany({ where: scopeCode ? { scopeCode } : undefined, orderBy: { sortOrder: 'asc' } }),
      createTopic: (input) => client.knowledgeTopic.create({ data: input }),
      updateTopic: async (topicCode, input) => {
        try { return await client.knowledgeTopic.update({ where: { topicCode }, data: input }); } catch (error) { if (isPrismaError(error, 'P2025')) return null; throw error; }
      },
      deleteTopic: async (topicCode) => {
        try { await client.knowledgeTopic.delete({ where: { topicCode } }); return true; } catch (error) { if (isPrismaError(error, 'P2025')) return false; throw error; }
      },
      findTopic: (topicCode) => client.knowledgeTopic.findUnique({ where: { topicCode } }),
      withScopeLocks: async (scopeCodes, lockedOperation) => client.$transaction(async (transaction) => {
        for (const scopeCode of sortedScopeCodes(scopeCodes)) {
          await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scopeCode}))`;
        }
        return lockedOperation(createPrismaRepository(transaction as typeof prisma));
      }),
    };
  }

  return operation(createPrismaRepository(prisma));
}

export const knowledgeService: KnowledgeService = {
  listScopes: () => withKnowledgeRepository((repository) => createKnowledgeService(repository).listScopes()),
  createScope: (input) => withKnowledgeRepository((repository) => createKnowledgeService(repository).createScope(input)),
  updateScope: (scopeCode, input) => withKnowledgeRepository((repository) => createKnowledgeService(repository).updateScope(scopeCode, input)),
  deleteScope: (scopeCode) => withKnowledgeRepository((repository) => createKnowledgeService(repository).deleteScope(scopeCode)),
  listTopics: (scopeCode) => withKnowledgeRepository((repository) => createKnowledgeService(repository).listTopics(scopeCode)),
  createTopic: (input) => withKnowledgeRepository((repository) => createKnowledgeService(repository).createTopic(input)),
  updateTopic: (topicCode, input) => withKnowledgeRepository((repository) => createKnowledgeService(repository).updateTopic(topicCode, input)),
  deleteTopic: (topicCode) => withKnowledgeRepository((repository) => createKnowledgeService(repository).deleteTopic(topicCode)),
};
