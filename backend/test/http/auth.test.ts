import type { RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { createAuthRouter, type AuthService } from '../../src/http/routes/auth.routes';

const user = { userId: 7, username: 'alice', role: 'admin' };
const authResult = { token: 'signed-token', user };

function createTestApp(authService: AuthService, requireAuth?: RequestHandler) {
  return createApp({ featureRouters: [createAuthRouter({ authService, requireAuth })] });
}

describe('authentication routes', () => {
  it('returns a stable login response', async () => {
    const authService: AuthService = {
      login: vi.fn().mockResolvedValue(authResult),
      register: vi.fn(),
    };

    const response = await request(createTestApp(authService))
      .post('/api/admin/auth/login')
      .send({ username: 'alice', password: 'secret1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(authResult);
  });

  it('rejects invalid credentials', async () => {
    const authService: AuthService = {
      login: vi.fn().mockResolvedValue(null),
      register: vi.fn(),
    };

    const response = await request(createTestApp(authService))
      .post('/api/admin/auth/login')
      .send({ username: 'alice', password: 'wrongpass' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a short registration password', async () => {
    const authService: AuthService = {
      login: vi.fn(),
      register: vi.fn(),
    };

    const response = await request(createTestApp(authService))
      .post('/api/admin/auth/register')
      .send({ username: 'alice', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('maps duplicate usernames to a conflict', async () => {
    const authService: AuthService = {
      login: vi.fn(),
      register: vi.fn().mockResolvedValue(null),
    };

    const response = await request(createTestApp(authService))
      .post('/api/admin/auth/register')
      .send({ username: 'alice', password: 'secret1' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('USERNAME_EXISTS');
  });

  it('returns the normalized registration response', async () => {
    const authService: AuthService = {
      login: vi.fn(),
      register: vi.fn().mockResolvedValue(authResult),
    };

    const response = await request(createTestApp(authService))
      .post('/api/admin/auth/register')
      .send({ username: 'alice', password: 'secret1' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(authResult);
  });

  it('rejects a missing bearer token', async () => {
    const authService: AuthService = { login: vi.fn(), register: vi.fn() };

    const response = await request(createTestApp(authService)).get('/api/admin/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns the authenticated user from me', async () => {
    const authService: AuthService = { login: vi.fn(), register: vi.fn() };
    const fakeRequireAuth: RequestHandler = (_req, res, next) => {
      res.locals.user = user;
      next();
    };

    const response = await request(createTestApp(authService, fakeRequireAuth)).get('/api/admin/auth/me');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user });
  });
});
