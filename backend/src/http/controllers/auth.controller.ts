import type { RequestHandler } from 'express';
import { type AuthService } from '../../application/auth/auth.service';
import { AppError } from '../errors/app-error';
import type { AuthenticatedUser } from '../middleware/auth';

export function createAuthController(authService: AuthService): {
  login: RequestHandler;
  register: RequestHandler;
  me: RequestHandler;
} {
  return {
    login: async (req, res, next) => {
      try {
        const result = await authService.login(req.body.username, req.body.password);
        if (!result) {
          throw new AppError('INVALID_CREDENTIALS', 'Invalid username or password', 401);
        }
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
    register: async (req, res, next) => {
      try {
        const result = await authService.register(req.body.username, req.body.password);
        if (!result) {
          throw new AppError('USERNAME_EXISTS', 'Username already exists', 409);
        }
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },
    me: (_req, res) => {
      res.json({ user: res.locals.user as AuthenticatedUser });
    },
  };
}
