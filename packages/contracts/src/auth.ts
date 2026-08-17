import { z } from 'zod';

export const CredentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});
export type Credentials = z.infer<typeof CredentialsSchema>;

export const AuthUserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const MeResponseSchema = z.object({ user: AuthUserSchema });
export type MeResponse = z.infer<typeof MeResponseSchema>;
