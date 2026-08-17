import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

describe('health routes', () => {
  it('returns liveness without touching middleware services', async () => {
    const response = await request(createApp()).get('/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns the request id in errors', async () => {
    const response = await request(createApp()).get('/missing');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.error.requestId).toMatch(/^req_/);
  });
});
