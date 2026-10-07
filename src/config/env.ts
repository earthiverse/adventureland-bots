import { z } from 'zod';

export const envSchema = z.object({
  EMAIL: z.email().min(2),
  PASSWORD: z.string().min(1),
  MONGO_URI: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
