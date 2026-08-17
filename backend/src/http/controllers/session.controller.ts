import type { RequestHandler } from 'express';
import type { SessionService } from '../../application/sessions/session.service';
import type { AuthenticatedUser } from '../middleware/auth';

export function createSessionController(sessionService: SessionService): {
  list: RequestHandler;
  exchanges: RequestHandler;
  summary: RequestHandler;
  rename: RequestHandler;
  reset: RequestHandler;
  remove: RequestHandler;
} {
  return {
    list: async (req, res, next) => {
      try {
        const query = req.query as unknown as { page: number; pageSize: number; keyword?: string };
        res.json(await sessionService.listSessions({ ...query, user: res.locals.user as AuthenticatedUser }));
      } catch (error) {
        next(error);
      }
    },
    exchanges: async (req, res, next) => {
      try {
        const { id: conversationId } = req.params as { id: string };
        const { limit } = req.query as unknown as { limit: number };
        const items = await sessionService.getExchanges({
          conversationId,
          limit,
          user: res.locals.user as AuthenticatedUser,
        });
        res.json({ items });
      } catch (error) {
        next(error);
      }
    },
    summary: async (req, res, next) => {
      try {
        const { id: conversationId } = req.params as { id: string };
        const summary = await sessionService.getSummary({
          conversationId,
          user: res.locals.user as AuthenticatedUser,
        });
        res.json({ summary });
      } catch (error) {
        next(error);
      }
    },
    rename: async (req, res, next) => {
      try {
        const { id: conversationId } = req.params as { id: string };
        const { title } = req.body as { title: string };
        await sessionService.renameSession({
          conversationId,
          title,
          user: res.locals.user as AuthenticatedUser,
        });
        res.json({ conversationId, title });
      } catch (error) {
        next(error);
      }
    },
    reset: async (req, res, next) => {
      try {
        const { id: conversationId } = req.params as { id: string };
        res.json({
          conversationId,
          ...(await sessionService.resetSession({
            conversationId,
            user: res.locals.user as AuthenticatedUser,
          })),
        });
      } catch (error) {
        next(error);
      }
    },
    remove: async (req, res, next) => {
      try {
        const { id: conversationId } = req.params as { id: string };
        await sessionService.deleteSession({
          conversationId,
          user: res.locals.user as AuthenticatedUser,
        });
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  };
}
