import type { NextFunction, Request, Response } from 'express';
import { extractToken, verifyToken } from '../../../lib/service/auth/jwt';
import { AppError } from '../errors/app-error';

export interface AuthenticatedUser {
  userId: number;
  username: string;
  role: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req.header('Authorization') ?? null);
  if (!token) {
    next(new AppError('AUTH_REQUIRED', 'Authentication is required', 401));
    return;
  }

  const user = verifyToken(token);
  if (!user) {
    next(new AppError('AUTH_REQUIRED', 'Authentication is required', 401));
    return;
  }

  res.locals.user = user satisfies AuthenticatedUser;
  next();
}

export function requireAdmin(_req: Request, res: Response, next: NextFunction): void {
  const user = res.locals.user as AuthenticatedUser | undefined;
  if (user?.role !== 'admin') {
    next(new AppError('ADMIN_REQUIRED', 'Administrator access is required', 403));
    return;
  }

  next();
}
