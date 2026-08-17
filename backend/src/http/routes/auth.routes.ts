import { CredentialsSchema } from '@next-ai/contracts';
import { Router, type RequestHandler } from 'express';
import { authService, type AuthService } from '../../application/auth/auth.service';
import { createAuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

export type { AuthService } from '../../application/auth/auth.service';

export interface CreateAuthRouterOptions {
  authService?: AuthService;
  requireAuth?: RequestHandler;
}

export function createAuthRouter(options: CreateAuthRouterOptions = {}): Router {
  const router = Router();
  const controller = createAuthController(options.authService ?? authService);

  router.post('/api/admin/auth/login', validate(CredentialsSchema), controller.login);
  router.post('/api/admin/auth/register', validate(CredentialsSchema.refine(
    ({ password }) => password.length >= 6,
    { path: ['password'], message: 'Password must be at least 6 characters' },
  )), controller.register);
  router.get('/api/admin/auth/me', options.requireAuth ?? requireAuth, controller.me);

  return router;
}
