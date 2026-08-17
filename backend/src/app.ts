import cors from 'cors';
import express, { type Express, type Router } from 'express';
import { runtimeConfig } from './config/runtime';
import { AppError } from './http/errors/app-error';
import { errorHandler } from './http/errors/error-handler';
import { requestId } from './http/middleware/request-id';
import { createHealthRouter, type ReadinessProbe } from './http/routes/health.routes';

export interface CreateAppOptions {
  readinessProbe?: ReadinessProbe;
  featureRouters?: Router[];
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.use(requestId);
  app.use(cors({ origin: runtimeConfig.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(createHealthRouter(options.readinessProbe));
  options.featureRouters?.forEach((router) => app.use(router));
  app.use((_req, _res, next) => next(new AppError('ROUTE_NOT_FOUND', 'Route not found', 404)));
  app.use(errorHandler);

  return app;
}
