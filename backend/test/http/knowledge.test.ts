import { signToken } from '../../lib/service/auth/jwt';
import type { KnowledgeService } from '../../src/application/knowledge/knowledge.service';
import { createApp } from '../../src/app';
import { createKnowledgeRouter } from '../../src/http/routes/knowledge.routes';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.ADMIN_TOKEN_SECRET = 'test-secret';
});

const adminToken = signToken({ userId: 1, username: 'admin', role: 'admin' });
const userToken = signToken({ userId: 2, username: 'alice', role: 'user' });

function createService(): KnowledgeService {
  return {
    listScopes: vi.fn().mockResolvedValue([{ code: 'hr', name: 'Human Resources', description: null }]),
    createScope: vi.fn().mockResolvedValue({ code: 'hr', name: 'Human Resources', description: null }),
    updateScope: vi.fn().mockResolvedValue({ code: 'hr', name: 'Human Resources', description: 'People operations' }),
    deleteScope: vi.fn().mockResolvedValue(undefined),
    listTopics: vi.fn().mockResolvedValue([{ code: 'payroll', scopeCode: 'hr', name: 'Payroll', description: null }]),
    createTopic: vi.fn().mockResolvedValue({ code: 'payroll', scopeCode: 'hr', name: 'Payroll', description: null }),
    updateTopic: vi.fn().mockResolvedValue({ code: 'payroll', scopeCode: 'hr', name: 'Compensation', description: null }),
    deleteTopic: vi.fn().mockResolvedValue(undefined),
  };
}

function createTestApp(knowledgeService: KnowledgeService) {
  return createApp({ featureRouters: [createKnowledgeRouter({ knowledgeService })] });
}

describe('knowledge routes', () => {
  it('requires an administrator for every knowledge route', async () => {
    const response = await request(createTestApp(createService()))
      .get('/api/manage/knowledge/scopes')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ADMIN_REQUIRED');
  });

  it('lists scopes for an administrator', async () => {
    const service = createService();
    const response = await request(createTestApp(service))
      .get('/api/manage/knowledge/scopes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [{ code: 'hr', name: 'Human Resources', description: null }] });
    expect(service.listScopes).toHaveBeenCalledOnce();
  });

  it('creates a scope only with POST', async () => {
    const service = createService();
    const response = await request(createTestApp(service))
      .post('/api/manage/knowledge/scopes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'hr', name: 'Human Resources' });

    expect(response.status).toBe(201);
    expect(response.body.code).toBe('hr');
    expect(service.createScope).toHaveBeenCalledWith({ code: 'hr', name: 'Human Resources' });
  });

  it('updates a scope through its resource path', async () => {
    const service = createService();
    const response = await request(createTestApp(service))
      .patch('/api/manage/knowledge/scopes/hr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Human Resources', description: 'People operations' });

    expect(response.status).toBe(200);
    expect(response.body.code).toBe('hr');
    expect(response.body.name).toBe('Human Resources');
    expect(service.updateScope).toHaveBeenCalledWith('hr', { name: 'Human Resources', description: 'People operations' });
  });

  it('deletes a scope through its resource path', async () => {
    const service = createService();
    const response = await request(createTestApp(service))
      .delete('/api/manage/knowledge/scopes/hr')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(204);
    expect(service.deleteScope).toHaveBeenCalledWith('hr');
  });

  it('filters topics by scope code', async () => {
    const service = createService();
    const response = await request(createTestApp(service))
      .get('/api/manage/knowledge/topics?scopeCode=hr')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(service.listTopics).toHaveBeenCalledWith('hr');
  });

  it('creates, updates, and deletes topics through resource routes', async () => {
    const service = createService();
    const app = createTestApp(service);

    const createResponse = await request(app).post('/api/manage/knowledge/topics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'payroll', scopeCode: 'hr', name: 'Payroll' });
    const updateResponse = await request(app).patch('/api/manage/knowledge/topics/payroll')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Compensation' });
    const deleteResponse = await request(app).delete('/api/manage/knowledge/topics/payroll')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(createResponse.status).toBe(201);
    expect(updateResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(204);
  });

  it('rejects invalid shared contract payloads before calling the service', async () => {
    const service = createService();
    const response = await request(createTestApp(service)).post('/api/manage/knowledge/scopes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: ' ', name: '' });

    expect(response.status).toBe(400);
    expect(service.createScope).not.toHaveBeenCalled();
  });
});
