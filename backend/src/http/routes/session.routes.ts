import { ExchangesQuerySchema, PaginationQuerySchema, RenameSessionSchema, SessionIdParamsSchema } from '@next-ai/contracts';
import { Router, type RequestHandler } from 'express';
import { sessionService, type SessionService } from '../../application/sessions/session.service';
import { createSessionController } from '../controllers/session.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

export interface CreateSessionRouterOptions {
  sessionService?: SessionService;
  requireAuth?: RequestHandler;
}

export function createSessionRouter(options: CreateSessionRouterOptions = {}): Router {
  const router = Router();
  const controller = createSessionController(options.sessionService ?? sessionService);
  const authenticate = options.requireAuth ?? requireAuth;

  router.get('/api/chat/sessions', authenticate, validate(PaginationQuerySchema, 'query'), controller.list);
  router.get('/api/chat/sessions/:id/exchanges', authenticate, validate(SessionIdParamsSchema, 'params'), validate(ExchangesQuerySchema, 'query'), controller.exchanges);
  router.get('/api/chat/sessions/:id/summary', authenticate, validate(SessionIdParamsSchema, 'params'), controller.summary);
  router.patch('/api/chat/sessions/:id', authenticate, validate(SessionIdParamsSchema, 'params'), validate(RenameSessionSchema), controller.rename);
  router.post('/api/chat/sessions/:id/reset', authenticate, validate(SessionIdParamsSchema, 'params'), controller.reset);
  router.delete('/api/chat/sessions/:id', authenticate, validate(SessionIdParamsSchema, 'params'), controller.remove);

  return router;
}
