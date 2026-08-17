import { z } from 'zod';

export const ChatModeSchema = z.enum(['OPEN_CHAT', 'AUTO_DOCUMENT', 'CURRENT_DOCUMENT']);
export type ChatMode = z.infer<typeof ChatModeSchema>;

export const ChatRequestSchema = z.object({
  conversationId: z.uuid().optional(),
  question: z.string().trim().min(1),
  chatMode: ChatModeSchema,
  selectedDocumentId: z.coerce.number().int().positive().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const SessionSchema = z.object({
  conversationId: z.string(),
  chatMode: ChatModeSchema,
  status: z.number().int(),
  title: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type Session = z.infer<typeof SessionSchema>;

export const SessionPageSchema = z.object({
  items: z.array(SessionSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});
export type SessionPage = z.infer<typeof SessionPageSchema>;

export const ExchangeSchema = z.object({
  conversationId: z.string(),
  exchangeId: z.number().int().positive(),
  question: z.string(),
  answer: z.string(),
  mode: z.string().optional(),
  exchangeState: z.number().int(),
  firstTokenLatencyMs: z.number().nonnegative().optional(),
  totalLatencyMs: z.number().nonnegative().optional(),
  finishNote: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
});
export type Exchange = z.infer<typeof ExchangeSchema>;

export const MemorySummarySchema = z.object({
  conversationId: z.string(),
  summary: z.string(),
  coveredExchangeId: z.number().int().nonnegative(),
  compressionCount: z.number().int().nonnegative(),
  updatedAt: z.coerce.date().optional(),
});
export type MemorySummary = z.infer<typeof MemorySummarySchema>;
