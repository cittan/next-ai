import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors/app-error';

type ValidationTarget = 'body' | 'params' | 'query';

export function validate<T>(schema: ZodType<T>, target: ValidationTarget = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(new AppError('BAD_REQUEST', 'Request validation failed', 400, result.error.flatten()));
      return;
    }
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
