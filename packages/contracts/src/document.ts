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
