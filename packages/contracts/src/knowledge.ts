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

export const UpdateKnowledgeScopeSchema = CreateKnowledgeScopeSchema.omit({ code: true }).partial()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'At least one scope field is required',
  });
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

export const UpdateKnowledgeTopicSchema = CreateKnowledgeTopicSchema.omit({ code: true }).partial()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'At least one topic field is required',
  });
export type UpdateKnowledgeTopic = z.infer<typeof UpdateKnowledgeTopicSchema>;

const KnowledgeCodeSchema = z.string().trim().min(1);

export const KnowledgeScopeParamsSchema = z.object({
  scopeCode: KnowledgeCodeSchema,
});
export type KnowledgeScopeParams = z.infer<typeof KnowledgeScopeParamsSchema>;

export const KnowledgeTopicParamsSchema = z.object({
  topicCode: KnowledgeCodeSchema,
});
export type KnowledgeTopicParams = z.infer<typeof KnowledgeTopicParamsSchema>;

export const KnowledgeTopicsQuerySchema = z.object({
  scopeCode: KnowledgeCodeSchema.optional(),
});
export type KnowledgeTopicsQuery = z.infer<typeof KnowledgeTopicsQuerySchema>;
