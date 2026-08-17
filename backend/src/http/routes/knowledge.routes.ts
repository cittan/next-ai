import {
  CreateKnowledgeScopeSchema,
  CreateKnowledgeTopicSchema,
  KnowledgeScopeParamsSchema,
  KnowledgeTopicParamsSchema,
  KnowledgeTopicsQuerySchema,
  UpdateKnowledgeScopeSchema,
  UpdateKnowledgeTopicSchema,
} from '@next-ai/contracts';
import { Router } from 'express';
import { knowledgeService, type KnowledgeService } from '../../application/knowledge/knowledge.service';
import { createKnowledgeController } from '../controllers/knowledge.controller';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

export interface CreateKnowledgeRouterOptions {
  knowledgeService?: KnowledgeService;
}

export function createKnowledgeRouter(options: CreateKnowledgeRouterOptions = {}): Router {
  const router = Router();
  const controller = createKnowledgeController(options.knowledgeService ?? knowledgeService);

  router.use('/api/manage/knowledge', requireAuth, requireAdmin);
  router.get('/api/manage/knowledge/scopes', controller.listScopes);
  router.post('/api/manage/knowledge/scopes', validate(CreateKnowledgeScopeSchema), controller.createScope);
  router.patch('/api/manage/knowledge/scopes/:scopeCode', validate(KnowledgeScopeParamsSchema, 'params'), validate(UpdateKnowledgeScopeSchema), controller.updateScope);
  router.delete('/api/manage/knowledge/scopes/:scopeCode', validate(KnowledgeScopeParamsSchema, 'params'), controller.deleteScope);
  router.get('/api/manage/knowledge/topics', validate(KnowledgeTopicsQuerySchema, 'query'), controller.listTopics);
  router.post('/api/manage/knowledge/topics', validate(CreateKnowledgeTopicSchema), controller.createTopic);
  router.patch('/api/manage/knowledge/topics/:topicCode', validate(KnowledgeTopicParamsSchema, 'params'), validate(UpdateKnowledgeTopicSchema), controller.updateTopic);
  router.delete('/api/manage/knowledge/topics/:topicCode', validate(KnowledgeTopicParamsSchema, 'params'), controller.deleteTopic);

  return router;
}
