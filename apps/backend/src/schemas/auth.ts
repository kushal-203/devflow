import { z } from 'zod';

export const LoginBody = z.object({
  email: z.email('Must be a valid email address').max(254).transform((e) => e.toLowerCase()),
  password: z.string().min(1, 'Password is required').max(200),
}).strict();
export type LoginBody = z.infer<typeof LoginBody>;
