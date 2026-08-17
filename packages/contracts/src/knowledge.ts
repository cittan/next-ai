import { z } from 'zod';

export const KnowledgeScopeSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type KnowledgeScope = z.infer<typeof KnowledgeScopeSchema>;

export const CreateKnowledgeScopeSchema = KnowledgeScopeSchema.pick({
  code: true,
  name: true,
  description: true,
});
export type CreateKnowledgeScope = z.infer<typeof CreateKnowledgeScopeSchema>;

export const UpdateKnowledgeScopeSchema = CreateKnowledgeScopeSchema.omit({ code: true }).partial();
export type UpdateKnowledgeScope = z.infer<typeof UpdateKnowledgeScopeSchema>;

export const KnowledgeTopicSchema = z.object({
  code: z.string().trim().min(1),
  scopeCode: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});
export type KnowledgeTopic = z.infer<typeof KnowledgeTopicSchema>;

export const CreateKnowledgeTopicSchema = KnowledgeTopicSchema.pick({
  code: true,
  scopeCode: true,
  name: true,
  description: true,
});
export type CreateKnowledgeTopic = z.infer<typeof CreateKnowledgeTopicSchema>;

export const UpdateKnowledgeTopicSchema = CreateKnowledgeTopicSchema.omit({ code: true, scopeCode: true }).partial();
export type UpdateKnowledgeTopic = z.infer<typeof UpdateKnowledgeTopicSchema>;
