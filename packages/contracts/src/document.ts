import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  fileName: z.string().optional(),
  contentType: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  scopeCode: z.string().nullable().optional(),
  topicCode: z.string().nullable().optional(),
  status: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const DocumentPageSchema = z.object({
  items: z.array(DocumentSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type DocumentPage = z.infer<typeof DocumentPageSchema>;

export const DocumentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  keyword: z.string().trim().optional(),
});
export type DocumentListQuery = z.infer<typeof DocumentListQuerySchema>;

export const DocumentIdParamsSchema = z.object({
  documentId: z.coerce.number().int().positive(),
});
export type DocumentIdParams = z.infer<typeof DocumentIdParamsSchema>;

export const DocumentUploadResponseSchema = z.object({
  documentId: z.number().int().positive(),
  taskId: z.number().int().positive(),
  documentName: z.string().min(1),
  parseStatus: z.number().int(),
  strategyStatus: z.number().int(),
  indexStatus: z.number().int(),
});
export type DocumentUploadResponse = z.infer<typeof DocumentUploadResponseSchema>;

export const DocumentTaskSchema = z.object({
  id: z.number().int().positive(),
  documentId: z.number().int().positive(),
  type: z.string(),
  status: z.string(),
  message: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type DocumentTask = z.infer<typeof DocumentTaskSchema>;

export const DocumentGraphSchema = z.object({
  documentId: z.number().int().positive(),
  nodes: z.array(z.object({ id: z.string(), label: z.string(), data: z.unknown().optional() })),
  edges: z.array(z.object({ source: z.string(), target: z.string(), label: z.string().optional() })),
});
export type DocumentGraph = z.infer<typeof DocumentGraphSchema>;
