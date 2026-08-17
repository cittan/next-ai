import { z } from 'zod';

const StreamIdentitySchema = z.object({
  conversationId: z.uuid(),
  exchangeId: z.number().int().positive(),
});

export const ChatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session'),
    conversationId: z.uuid(),
    exchangeId: z.number().int().positive(),
  }),
  StreamIdentitySchema.extend({ type: z.literal('token'), token: z.string() }),
  StreamIdentitySchema.extend({ type: z.literal('done'), totalLatencyMs: z.number().nonnegative() }),
  StreamIdentitySchema.extend({ type: z.literal('error'), code: z.string(), message: z.string() }),
]);
export type ChatStreamEvent = z.infer<typeof ChatStreamEventSchema>;
