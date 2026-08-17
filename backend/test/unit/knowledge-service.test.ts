import { describe, expect, it, vi } from 'vitest';
import { createKnowledgeService, type KnowledgeRepository } from '../../src/application/knowledge/knowledge.service';

const hrScope = { scopeCode: 'hr', scopeName: 'Human Resources', description: null };
const payrollTopic = { topicCode: 'payroll', scopeCode: 'hr', topicName: 'Payroll', description: null };

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
    withTopicLock: vi.fn(),
    ...overrides,
  } as KnowledgeRepository;
  if (!overrides.withScopeLocks) repository.withScopeLocks = vi.fn((_scopeCodes, operation) => operation(repository));
  if (!overrides.withTopicLock) repository.withTopicLock = vi.fn((_topicCode, operation) => operation(repository));
  return repository;
}

describe('knowledge service', () => {
  it('creates and normalizes a scope', async () => {
    const repository = createRepository({ createScope: vi.fn().mockResolvedValue(hrScope) });

    await expect(createKnowledgeService(repository).createScope({ code: 'hr', name: 'Human Resources', description: null }))
      .resolves.toEqual({ code: 'hr', name: 'Human Resources', description: null });
  });

  it('locks a scope before creating it', async () => {
    const events: string[] = [];
    const repository = createRepository({
      withScopeLocks: vi.fn(async (keys, operation) => { events.push(`scope-lock:${keys.join(',')}`); return operation(repository); }),
      createScope: vi.fn(async () => { events.push('create-scope'); return hrScope; }),
    });

    await createKnowledgeService(repository).createScope({ code: 'hr', name: 'Human Resources' });

    expect(events).toEqual(['scope-lock:hr', 'create-scope']);
  });

  it('translates a duplicate scope code into a conflict', async () => {
    const repository = createRepository({ createScope: vi.fn().mockRejectedValue({ code: 'P2002' }) });

    await expect(createKnowledgeService(repository).createScope({ code: 'hr', name: 'Human Resources' }))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_CODE_EXISTS', statusCode: 409 });
  });

  it('locks a scope before finding and updating it', async () => {
    const events: string[] = [];
    const repository = createRepository({
      withScopeLocks: vi.fn(async (keys, operation) => { events.push(`scope-lock:${keys.join(',')}`); return operation(repository); }),
      findScope: vi.fn(async () => { events.push('find-scope'); return hrScope; }),
      updateScope: vi.fn(async () => { events.push('update-scope'); return { ...hrScope, scopeName: 'People Operations' }; }),
    });

    await createKnowledgeService(repository).updateScope('hr', { name: 'People Operations' });

    expect(events).toEqual(['scope-lock:hr', 'find-scope', 'update-scope']);
  });

  it('returns not found when updating a missing scope', async () => {
    await expect(createKnowledgeService(createRepository()).updateScope('missing', { name: 'Missing' }))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_SCOPE_NOT_FOUND', statusCode: 404 });
  });

  it('locks topic before scope before verifying and creating a topic', async () => {
    const events: string[] = [];
    const repository = createRepository({
      withTopicLock: vi.fn(async (code, operation) => { events.push(`topic-lock:${code}`); return operation(repository); }),
      withScopeLocks: vi.fn(async (keys, operation) => { events.push(`scope-lock:${keys.join(',')}`); return operation(repository); }),
      findScope: vi.fn(async () => { events.push('find-scope'); return hrScope; }),
      createTopic: vi.fn(async () => { events.push('create-topic'); return payrollTopic; }),
    });

    await createKnowledgeService(repository).createTopic({ code: 'payroll', scopeCode: 'hr', name: 'Payroll' });

    expect(events).toEqual(['topic-lock:payroll', 'scope-lock:hr', 'find-scope', 'create-topic']);
  });

  it('validates the parent scope before creating a topic', async () => {
    const repository = createRepository();
    await expect(createKnowledgeService(repository).createTopic({ code: 'payroll', scopeCode: 'hr', name: 'Payroll' }))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_SCOPE_NOT_FOUND', statusCode: 404 });
    expect(repository.createTopic).not.toHaveBeenCalled();
  });

  it('locks topic before sorted old and new scope keys when moving a topic', async () => {
    const events: string[] = [];
    const repository = createRepository({
      withTopicLock: vi.fn(async (code, operation) => { events.push(`topic-lock:${code}`); return operation(repository); }),
      withScopeLocks: vi.fn(async (keys, operation) => { events.push(`scope-lock:${keys.join(',')}`); return operation(repository); }),
      findTopic: vi.fn(async () => { events.push('find-topic'); return payrollTopic; }),
      findScope: vi.fn(async () => { events.push('find-target-scope'); return { scopeCode: 'finance', scopeName: 'Finance', description: null }; }),
      updateTopic: vi.fn(async () => { events.push('update-topic'); return { ...payrollTopic, scopeCode: 'finance' }; }),
    });

    await createKnowledgeService(repository).updateTopic('payroll', { scopeCode: 'finance' });

    expect(events).toEqual([
      'topic-lock:payroll', 'find-topic', 'scope-lock:finance,hr', 'find-target-scope', 'update-topic',
    ]);
  });

  it('uses only the in-transaction topic read when deriving a move scope lock', async () => {
    const lockKeys: string[][] = [];
    const repository = createRepository({
      withTopicLock: vi.fn(async (_code, operation) => operation(repository)),
      withScopeLocks: vi.fn(async (keys, operation) => { lockKeys.push(keys); return operation(repository); }),
      findTopic: vi.fn().mockResolvedValue({ ...payrollTopic, scopeCode: 'finance' }),
      findScope: vi.fn().mockResolvedValue({ scopeCode: 'finance', scopeName: 'Finance', description: null }),
      updateTopic: vi.fn().mockResolvedValue({ ...payrollTopic, scopeCode: 'finance' }),
    });

    await createKnowledgeService(repository).updateTopic('payroll', { name: 'Compensation' });

    expect(lockKeys).toEqual([['finance']]);
    expect(repository.findTopic).toHaveBeenCalledOnce();
  });

  it('filters topics by scope code', async () => {
    const listTopics = vi.fn().mockResolvedValue([]);
    await createKnowledgeService(createRepository({ listTopics })).listTopics('hr');
    expect(listTopics).toHaveBeenCalledWith('hr');
  });

  it('uses the same scope lock key for topic creation and scope deletion', async () => {
    const lockKeys: string[][] = [];
    const repository = createRepository({
      withScopeLocks: vi.fn(async (keys, operation) => { lockKeys.push(keys); return operation(repository); }),
      findScope: vi.fn().mockResolvedValue(hrScope),
      createTopic: vi.fn().mockResolvedValue(payrollTopic),
      listTopics: vi.fn().mockResolvedValue([]),
      deleteScope: vi.fn().mockResolvedValue(true),
    });
    const service = createKnowledgeService(repository);

    await service.createTopic({ code: 'payroll', scopeCode: 'hr', name: 'Payroll' });
    await service.deleteScope('hr');

    expect(lockKeys).toEqual([['hr'], ['hr']]);
  });

  it('rejects deletion of a scope that still has topics', async () => {
    const repository = createRepository({ findScope: vi.fn().mockResolvedValue(hrScope), listTopics: vi.fn().mockResolvedValue([payrollTopic]) });
    await expect(createKnowledgeService(repository).deleteScope('hr'))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_SCOPE_IN_USE', statusCode: 409 });
    expect(repository.deleteScope).not.toHaveBeenCalled();
  });

  it('does not read a topic before its transaction and locks its current scope before deletion', async () => {
    const events: string[] = [];
    const repository = createRepository({
      withTopicLock: vi.fn(async (code, operation) => { events.push(`topic-lock:${code}`); return operation(repository); }),
      findTopic: vi.fn(async () => { events.push('find-topic'); return payrollTopic; }),
      withScopeLocks: vi.fn(async (keys, operation) => { events.push(`scope-lock:${keys.join(',')}`); return operation(repository); }),
      deleteTopic: vi.fn(async () => { events.push('delete-topic'); return true; }),
    });

    await createKnowledgeService(repository).deleteTopic('payroll');

    expect(events).toEqual(['topic-lock:payroll', 'find-topic', 'scope-lock:hr', 'delete-topic']);
  });

  it('uses the unscoped sentinel lock key when deleting an unscoped topic', async () => {
    const lockKeys: string[][] = [];
    const repository = createRepository({
      findTopic: vi.fn().mockResolvedValue({ topicCode: 'legacy', scopeCode: null, topicName: 'Legacy', description: null }),
      withScopeLocks: vi.fn(async (keys, operation) => { lockKeys.push(keys); return operation(repository); }),
      deleteTopic: vi.fn().mockResolvedValue(true),
    });

    await createKnowledgeService(repository).deleteTopic('legacy');

    expect(lockKeys).toEqual([['__unscoped_topics__']]);
  });

  it('returns not found when deleting a missing topic', async () => {
    await expect(createKnowledgeService(createRepository()).deleteTopic('missing'))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_TOPIC_NOT_FOUND', statusCode: 404 });
  });
});
