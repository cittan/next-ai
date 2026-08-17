import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../../src/http/errors/error-handler';
import { requestId } from '../../src/http/middleware/request-id';
import { validate } from '../../src/http/middleware/validate';

describe('validate middleware', () => {
  it('replaces and coerces a request body', async () => {
    const app = express();
    app.use(express.json());
    app.post('/body', validate(z.object({ count: z.coerce.number().int() })), (req, res) => res.json(req.body));

    const response = await request(app).post('/body').send({ count: '2', ignored: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 2 });
  });

  it('replaces and coerces route params', async () => {
    const app = express();
    app.get('/documents/:id', validate(z.object({ id: z.coerce.number().int() }), 'params'), (req, res) => res.json(req.params));

    const response = await request(app).get('/documents/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 7 });
  });

  it('replaces and coerces query values', async () => {
    const app = express();
    app.get('/search', validate(z.object({ page: z.coerce.number().int() }), 'query'), (req, res) => res.json(req.query));

    const response = await request(app).get('/search?page=3&ignored=yes');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ page: 3 });
  });

  it('returns the shared BAD_REQUEST envelope for invalid input', async () => {
    const app = express();
    app.use(requestId);
    app.use(express.json());
    app.post('/body', validate(z.object({ count: z.coerce.number().int() })), (_req, res) => res.sendStatus(204));
    app.use(errorHandler);

    const response = await request(app).post('/body').send({ count: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
    expect(response.body.error.message).toBe('Request validation failed');
    expect(response.body.error.requestId).toMatch(/^req_/);
  });
});
