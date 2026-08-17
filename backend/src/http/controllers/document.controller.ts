import type { RequestHandler } from 'express';
import type { DocumentQueryService } from '../../application/documents/document-query.service';
import type { DocumentUploadService } from '../../application/documents/document-upload.service';
import { AppError } from '../errors/app-error';

export function createDocumentController(queryService: DocumentQueryService, uploadService: DocumentUploadService): {
  list: RequestHandler;
  get: RequestHandler;
  upload: RequestHandler;
} {
  return {
    list: async (req, res, next) => {
      try {
        const query = req.query as unknown as { page: number; pageSize: number; keyword?: string };
        res.json(await queryService.list(query));
      } catch (error) {
        next(error);
      }
    },
    get: async (req, res, next) => {
      try {
        const { documentId } = req.params as unknown as { documentId: number };
        const document = await queryService.get(documentId);
        if (!document) throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
        res.json(document);
      } catch (error) {
        next(error);
      }
    },
    upload: async (req, res, next) => {
      try {
        if (!req.file) throw new AppError('BAD_REQUEST', 'Multipart field "file" is required', 400);
        res.status(202).json(await uploadService.upload({
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer,
        }));
      } catch (error) {
        next(error);
      }
    },
  };
}
