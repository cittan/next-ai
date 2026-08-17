import { describe, expect, it, vi } from 'vitest';
import { createKnowledgeService, type KnowledgeRepository } from '../../src/application/knowledge/knowledge.service';

function createRepository(overrides: Partial<KnowledgeRepository> = {}): KnowledgeRepository {
  return {
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
    ...overrides,
  };
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

  it('translates a duplicate scope code into a conflict', async () => {
    const repository = createRepository({
      createScope: vi.fn().mockRejectedValue({ code: 'P2002' }),
    });

    await expect(createKnowledgeService(repository).createScope({ code: 'hr', name: 'Human Resources' }))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_CODE_EXISTS', statusCode: 409 });
  });

  it('returns not found when updating a missing scope', async () => {
    const repository = createRepository({ updateScope: vi.fn().mockResolvedValue(null) });

    await expect(createKnowledgeService(repository).updateScope('missing', { name: 'Missing' }))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_SCOPE_NOT_FOUND', statusCode: 404 });
  });

  it('validates the parent scope before creating a topic', async () => {
    const repository = createRepository();

    await expect(createKnowledgeService(repository).createTopic({
      code: 'payroll', scopeCode: 'hr', name: 'Payroll',
    })).rejects.toMatchObject({ code: 'KNOWLEDGE_SCOPE_NOT_FOUND', statusCode: 404 });
    expect(repository.createTopic).not.toHaveBeenCalled();
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

  it('rejects deletion of a scope that still has topics', async () => {
    const repository = createRepository({
      findScope: vi.fn().mockResolvedValue({ scopeCode: 'hr', scopeName: 'Human Resources', description: null }),
      listTopics: vi.fn().mockResolvedValue([{ topicCode: 'payroll', scopeCode: 'hr', topicName: 'Payroll', description: null }]),
    });

    await expect(createKnowledgeService(repository).deleteScope('hr'))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_SCOPE_IN_USE', statusCode: 409 });
    expect(repository.deleteScope).not.toHaveBeenCalled();
  });

  it('returns not found when deleting a missing topic', async () => {
    const repository = createRepository({ deleteTopic: vi.fn().mockResolvedValue(null) });

    await expect(createKnowledgeService(repository).deleteTopic('missing'))
      .rejects.toMatchObject({ code: 'KNOWLEDGE_TOPIC_NOT_FOUND', statusCode: 404 });
  });
});
