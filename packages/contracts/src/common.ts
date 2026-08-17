import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive(),
  pageSize: z.coerce.number().int().positive(),
  keyword: z.string().trim().optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullable(),
    requestId: z.string(),
  }),
});
export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
