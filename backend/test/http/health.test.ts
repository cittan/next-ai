import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

describe('health routes', () => {
  it('returns liveness without touching middleware services', async () => {
    const response = await request(createApp()).get('/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('reports an all-up readiness probe', async () => {
    const response = await request(createApp({
      readinessProbe: async () => ({ postgres: 'up' }),
    })).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', dependencies: { postgres: 'up' } });
  });

  it('reports unavailable when a readiness dependency is down', async () => {
    const response = await request(createApp({
      readinessProbe: async () => ({ postgres: 'down' }),
    })).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'down', dependencies: { postgres: 'down' } });
  });

  it('sends rejected readiness probes through the shared error handler', async () => {
    const response = await request(createApp({
      readinessProbe: async () => { throw new Error('database unavailable'); },
    })).get('/health/ready');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(response.body.error.requestId).toMatch(/^req_/);
  });

  it('returns the request id in errors', async () => {
    const response = await request(createApp()).get('/missing');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.error.requestId).toMatch(/^req_/);
  });
});
