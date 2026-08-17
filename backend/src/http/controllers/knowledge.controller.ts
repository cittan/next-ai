import type { RequestHandler } from 'express';
import type { KnowledgeService } from '../../application/knowledge/knowledge.service';

export function createKnowledgeController(knowledgeService: KnowledgeService): {
  listScopes: RequestHandler;
  createScope: RequestHandler;
  updateScope: RequestHandler;
  deleteScope: RequestHandler;
  listTopics: RequestHandler;
  createTopic: RequestHandler;
  updateTopic: RequestHandler;
  deleteTopic: RequestHandler;
} {
  return {
    listScopes: async (_req, res, next) => {
      try { res.json({ items: await knowledgeService.listScopes() }); } catch (error) { next(error); }
    },
    createScope: async (req, res, next) => {
      try { res.status(201).json(await knowledgeService.createScope(req.body)); } catch (error) { next(error); }
    },
    updateScope: async (req, res, next) => {
      try { res.json(await knowledgeService.updateScope((req.params as { scopeCode: string }).scopeCode, req.body)); } catch (error) { next(error); }
    },
    deleteScope: async (req, res, next) => {
      try { await knowledgeService.deleteScope((req.params as { scopeCode: string }).scopeCode); res.status(204).send(); } catch (error) { next(error); }
    },
    listTopics: async (req, res, next) => {
      try { res.json({ items: await knowledgeService.listTopics((req.query as { scopeCode?: string }).scopeCode) }); } catch (error) { next(error); }
    },
    createTopic: async (req, res, next) => {
      try { res.status(201).json(await knowledgeService.createTopic(req.body)); } catch (error) { next(error); }
    },
    updateTopic: async (req, res, next) => {
      try { res.json(await knowledgeService.updateTopic((req.params as { topicCode: string }).topicCode, req.body)); } catch (error) { next(error); }
    },
    deleteTopic: async (req, res, next) => {
      try { await knowledgeService.deleteTopic((req.params as { topicCode: string }).topicCode); res.status(204).send(); } catch (error) { next(error); }
    },
  };
}
