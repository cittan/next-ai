import type { ErrorRequestHandler } from 'express';
import { AppError } from './app-error';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const appError = error instanceof AppError
    ? error
    : new AppError('INTERNAL_SERVER_ERROR', 'Internal server error', 500);

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      requestId: res.locals.requestId ?? 'req_unknown',
    },
  });
};
