import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { sessionService, type SessionService } from '../../application/sessions/session.service';
import { createSessionController } from '../controllers/session.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const SessionIdSchema = z.object({ id: z.uuid() });
const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive(),
  pageSize: z.coerce.number().int().positive(),
  keyword: z.string().trim().optional(),
});
const ExchangesQuerySchema = z.object({ limit: z.coerce.number().int().positive().max(100).default(50) });
const RenameSessionSchema = z.object({ title: z.string().trim().min(1).max(200) });

export interface CreateSessionRouterOptions {
  sessionService?: SessionService;
  requireAuth?: RequestHandler;
}

export function createSessionRouter(options: CreateSessionRouterOptions = {}): Router {
  const router = Router();
  const controller = createSessionController(options.sessionService ?? sessionService);
  const authenticate = options.requireAuth ?? requireAuth;

  router.get('/api/chat/sessions', authenticate, validate(PaginationQuerySchema, 'query'), controller.list);
  router.get('/api/chat/sessions/:id/exchanges', authenticate, validate(SessionIdSchema, 'params'), validate(ExchangesQuerySchema, 'query'), controller.exchanges);
  router.get('/api/chat/sessions/:id/summary', authenticate, validate(SessionIdSchema, 'params'), controller.summary);
  router.patch('/api/chat/sessions/:id', authenticate, validate(SessionIdSchema, 'params'), validate(RenameSessionSchema), controller.rename);
  router.post('/api/chat/sessions/:id/reset', authenticate, validate(SessionIdSchema, 'params'), controller.reset);
  router.delete('/api/chat/sessions/:id', authenticate, validate(SessionIdSchema, 'params'), controller.remove);

  return router;
}
