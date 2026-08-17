import { describe, expect, it, vi } from 'vitest';
import { createKnowledgeService, type KnowledgeRepository } from '../../src/application/knowledge/knowledge.service';

function createRepository(overrides: Partial<KnowledgeRepository> = {}): KnowledgeRepository {
  const repository = {
    listScopes: vi.fn().mockResolvedValue([]),
    createScope: vi.fn(),
    updateScope: vi.fn(),
    deleteScope: vi.fn(),
    findScope: vi.fn().mockResolvedValue(null),
    listTopics: vi.fn().mockResolvedValue([]),
    createTopic: vi.fn(),
    updateTopic: vi.fn(),
    deleteTopic: vi.fn(),
    findTopic: vi.fn().mockResolvedValue(null),
    withScopeLocks: vi.fn(),
    ...overrides,
  } as KnowledgeRepository;
  if (!overrides.withScopeLocks) {
    repository.withScopeLocks = vi.fn((_scopeCodes, operation) => operation(repository));
  }
  return repository;
}

describe('knowledge service', () => {
  it('creates and normalizes a scope', async () => {
    const repository = createRepository({
      createScope: vi.fn().mockResolvedValue({ scopeCode: 'hr', scopeName: 'Human Resources', description: null }),
    });

    await expect(createKnowledgeService(repository).createScope({
      code: 'hr', name: 'Human Resources', description: null,
    })).resolves.toEqual({ code: 'hr', name: 'Human Resources', description: null });
  });

  it('locks a scope before creating it', async () => {
    const events: string[] = [];
    const repository = createRepository({
      withScopeLocks: vi.fn(async (scopeCodes, operation) => {
        events.push(`lock:${scopeCodes.join(',')}`);
        return operation(repository);
      }),
      createScope: vi.fn(async () => {
        events.push('create-scope');
        return { scopeCode: 'hr', scopeName: 'Human Resources', description: null };
      }),
    });

    await createKnowledgeService(repository).createScope({ code: 'hr', name: 'Human Resources' });

    expect(events).toEqual(['lock:hr', 'create-scope']);
  });

  it('translates a duplicate scope code into a conflict', async () => {
    const repository = createRepository({
      createScope: vi.fn().mockRejectedValue({ code: 'P2002' }),
    });

    await expect(createKnowledgeService(repository).createScope({ code: 'hr', name: 'Human Resources' }))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_CODE_EXISTS', statusCode: 409 });
  });

  it('locks a scope before finding and updating it', async () => {
    const events: string[] = [];
    const repository = createRepository({
      withScopeLocks: vi.fn(async (scopeCodes, operation) => {
        events.push(`lock:${scopeCodes.join(',')}`);
        return operation(repository);
      }),
      findScope: vi.fn(async () => {
        events.push('find-scope');
        return { scopeCode: 'hr', scopeName: 'Human Resources', description: null };
      }),
      updateScope: vi.fn(async () => {
        events.push('update-scope');
        return { scopeCode: 'hr', scopeName: 'People Operations', description: null };
      }),
    });

    await createKnowledgeService(repository).updateScope('hr', { name: 'People Operations' });

    expect(events).toEqual(['lock:hr', 'find-scope', 'update-scope']);
  });

  it('returns not found when updating a missing scope', async () => {
    const repository = createRepository({ updateScope: vi.fn().mockResolvedValue(null) });

    await expect(createKnowledgeService(repository).updateScope('missing', { name: 'Missing' }))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_SCOPE_NOT_FOUND', statusCode: 404 });
  });

  it('locks the scope before verifying and creating a topic', async () => {
    const events: string[] = [];
    const repository = createRepository({
      withScopeLocks: vi.fn(async (scopeCodes, operation) => {
        events.push(`lock:${scopeCodes.join(',')}`);
        return operation(repository);
      }),
      findScope: vi.fn(async () => {
        events.push('find-scope');
        return { scopeCode: 'hr', scopeName: 'Human Resources', description: null };
      }),
      createTopic: vi.fn(async () => {
        events.push('create-topic');
        return { topicCode: 'payroll', scopeCode: 'hr', topicName: 'Payroll', description: null };
      }),
    });

    await createKnowledgeService(repository).createTopic({ code: 'payroll', scopeCode: 'hr', name: 'Payroll' });

    expect(events).toEqual(['lock:hr', 'find-scope', 'create-topic']);
  });

  it('validates the parent scope before creating a topic', async () => {
    const repository = createRepository();

    await expect(createKnowledgeService(repository).createTopic({
      code: 'payroll', scopeCode: 'hr', name: 'Payroll',
    })).rejects.toMatchObject({ code: 'KNOWLEDGE_SCOPE_NOT_FOUND', statusCode: 404 });
    expect(repository.createTopic).not.toHaveBeenCalled();
  });

  it('locks old and new scope codes in stable order before moving a topic', async () => {
    const events: string[] = [];
    const repository = createRepository({
      findTopic: vi.fn(async () => {
        events.push('find-topic');
        return { topicCode: 'payroll', scopeCode: 'hr', topicName: 'Payroll', description: null };
      }),
      withScopeLocks: vi.fn(async (scopeCodes, operation) => {
        events.push(`lock:${scopeCodes.join(',')}`);
        return operation(repository);
      }),
      findScope: vi.fn(async () => {
        events.push('find-target-scope');
        return { scopeCode: 'finance', scopeName: 'Finance', description: null };
      }),
      updateTopic: vi.fn(async () => {
        events.push('update-topic');
        return { topicCode: 'payroll', scopeCode: 'finance', topicName: 'Payroll', description: null };
      }),
    });

    await createKnowledgeService(repository).updateTopic('payroll', { scopeCode: 'finance' });

    expect(events).toEqual([
      'find-topic',
      'lock:finance,hr',
      'find-topic',
      'find-target-scope',
      'update-topic',
    ]);
  });

  it('validates the existing topic and new parent scope before updating a topic', async () => {
    const repository = createRepository({
      findTopic: vi.fn().mockResolvedValue({ topicCode: 'payroll', scopeCode: 'hr', topicName: 'Payroll', description: null }),
      findScope: vi.fn().mockResolvedValue(null),
    });

    await expect(createKnowledgeService(repository).updateTopic('payroll', { scopeCode: 'finance' }))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_SCOPE_NOT_FOUND', statusCode: 404 });
    expect(repository.updateTopic).not.toHaveBeenCalled();
  });

  it('filters topics by scope code', async () => {
    const listTopics = vi.fn().mockResolvedValue([]);
    const service = createKnowledgeService(createRepository({ listTopics }));

    await service.listTopics('hr');

    expect(listTopics).toHaveBeenCalledWith('hr');
  });

  it('uses the same scope lock key for topic creation and scope deletion', async () => {
    const lockKeys: string[][] = [];
    const repository = createRepository({
      withScopeLocks: vi.fn(async (scopeCodes, operation) => {
        lockKeys.push(scopeCodes);
        return operation(repository);
      }),
      findScope: vi.fn().mockResolvedValue({ scopeCode: 'hr', scopeName: 'Human Resources', description: null }),
      createTopic: vi.fn().mockResolvedValue({ topicCode: 'payroll', scopeCode: 'hr', topicName: 'Payroll', description: null }),
      listTopics: vi.fn().mockResolvedValue([]),
      deleteScope: vi.fn().mockResolvedValue(true),
    });
    const service = createKnowledgeService(repository);

    await service.createTopic({ code: 'payroll', scopeCode: 'hr', name: 'Payroll' });
    await service.deleteScope('hr');

    expect(lockKeys).toEqual([['hr'], ['hr']]);
  });

  it('rejects deletion of a scope that still has topics', async () => {
    const repository = createRepository({
      findScope: vi.fn().mockResolvedValue({ scopeCode: 'hr', scopeName: 'Human Resources', description: null }),
      listTopics: vi.fn().mockResolvedValue([{ topicCode: 'payroll', scopeCode: 'hr', topicName: 'Payroll', description: null }]),
    });

    await expect(createKnowledgeService(repository).deleteScope('hr'))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_SCOPE_IN_USE', statusCode: 409 });
    expect(repository.deleteScope).not.toHaveBeenCalled();
  });

  it('locks a topic scope before re-reading and deleting the topic', async () => {
    const events: string[] = [];
    const repository = createRepository({
      findTopic: vi.fn(async () => {
        events.push('find-topic');
        return { topicCode: 'payroll', scopeCode: 'hr', topicName: 'Payroll', description: null };
      }),
      withScopeLocks: vi.fn(async (scopeCodes, operation) => {
        events.push(`lock:${scopeCodes.join(',')}`);
        return operation(repository);
      }),
      deleteTopic: vi.fn(async () => {
        events.push('delete-topic');
        return true;
      }),
    });

    await createKnowledgeService(repository).deleteTopic('payroll');

    expect(events).toEqual(['find-topic', 'lock:hr', 'find-topic', 'delete-topic']);
  });

  it('uses the unscoped sentinel lock key when deleting an unscoped topic', async () => {
    const lockKeys: string[][] = [];
    const repository = createRepository({
      findTopic: vi.fn().mockResolvedValue({ topicCode: 'legacy', scopeCode: null, topicName: 'Legacy', description: null }),
      withScopeLocks: vi.fn(async (scopeCodes, operation) => {
        lockKeys.push(scopeCodes);
        return operation(repository);
      }),
      deleteTopic: vi.fn().mockResolvedValue(true),
    });

    await createKnowledgeService(repository).deleteTopic('legacy');

    expect(lockKeys).toEqual([['__unscoped_topics__']]);
  });

  it('returns not found when deleting a missing topic', async () => {
    const repository = createRepository({ deleteTopic: vi.fn().mockResolvedValue(null) });

    await expect(createKnowledgeService(repository).deleteTopic('missing'))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_TOPIC_NOT_FOUND', statusCode: 404 });
  });
});
