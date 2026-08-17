import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { extractToken, verifyToken } from '../../lib/service/auth/jwt';
import { errorHandler } from '../../src/http/errors/error-handler';
import { requireAdmin, requireAuth } from '../../src/http/middleware/auth';

vi.mock('../../lib/service/auth/jwt', () => ({
  extractToken: vi.fn(),
  verifyToken: vi.fn(),
}));

describe('authentication middleware', () => {
  it('stores a verified bearer-token user on response locals', async () => {
    vi.mocked(extractToken).mockReturnValue('signed-token');
    vi.mocked(verifyToken).mockReturnValue({ userId: 7, username: 'alice', role: 'admin' });
    const app = express();
    app.get('/me', requireAuth, (_req, res) => res.json(res.locals.user));
    app.use(errorHandler);

    const response = await request(app).get('/me').set('Authorization', 'Bearer signed-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: 7, username: 'alice', role: 'admin' });
  });

  it('rejects a non-admin user', async () => {
    const app = express();
    app.get('/admin', (_req, res, next) => {
      res.locals.user = { userId: 7, username: 'alice', role: 'user' };
      next();
    }, requireAdmin, (_req, res) => res.sendStatus(204));
    app.use(errorHandler);

    const response = await request(app).get('/admin');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ADMIN_REQUIRED');
  });

  it('allows an admin user', async () => {
    const app = express();
    app.get('/admin', (_req, res, next) => {
      res.locals.user = { userId: 7, username: 'alice', role: 'admin' };
      next();
    }, requireAdmin, (_req, res) => res.sendStatus(204));
    app.use(errorHandler);

    const response = await request(app).get('/admin');

    expect(response.status).toBe(204);
  });
});
