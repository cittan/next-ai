import { DocumentIdParamsSchema, DocumentListQuerySchema } from '@next-ai/contracts';
import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { documentQueryService, type DocumentQueryService } from '../../application/documents/document-query.service';
import { documentUploadService, type DocumentUploadService } from '../../application/documents/document-upload.service';
import { runtimeConfig } from '../../config/runtime';
import { createDocumentController } from '../controllers/document.controller';
import { AppError } from '../errors/app-error';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

export interface CreateDocumentRouterOptions {
  queryService?: DocumentQueryService;
  uploadService?: DocumentUploadService;
  maxUploadBytes?: number;
  requireAuth?: RequestHandler;
  requireAdmin?: RequestHandler;
}

export function createDocumentRouter(options: CreateDocumentRouterOptions = {}): Router {
  const router = Router();
  const controller = createDocumentController(options.queryService ?? documentQueryService, options.uploadService ?? documentUploadService);
  const maxUploadBytes = options.maxUploadBytes ?? runtimeConfig.maxUploadBytes;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxUploadBytes } });
  const authenticate = options.requireAuth ?? requireAuth;
  const authorizeAdmin = options.requireAdmin ?? requireAdmin;

  router.use('/api/manage/documents', authenticate, authorizeAdmin);
  router.get('/api/manage/documents', validate(DocumentListQuerySchema, 'query'), controller.list);
  router.get('/api/manage/documents/:documentId', validate(DocumentIdParamsSchema, 'params'), controller.get);
  router.post('/api/manage/documents', (req, res, next) => {
    upload.single('file')(req, res, (error) => {
      if (error) {
        next(new AppError('BAD_REQUEST', error.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file exceeds the size limit' : 'Invalid multipart upload', 400));
        return;
      }
      next();
    });
  }, controller.upload);

  return router;
}
