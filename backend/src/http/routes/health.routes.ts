import { Router } from 'express';

export type ReadinessProbe = () => Promise<Record<string, 'up' | 'down'>>;

export function createHealthRouter(readinessProbe?: ReadinessProbe): Router {
  const router = Router();

  router.get('/health/live', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/health/ready', async (_req, res, next) => {
    try {
      const dependencies = readinessProbe ? await readinessProbe() : {};
      const status = Object.values(dependencies).every((value) => value === 'up') ? 'ok' : 'down';
      res.status(status === 'ok' ? 200 : 503).json({ status, dependencies });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
