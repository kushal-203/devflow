import { z } from 'zod';

// Fail fast on bad configuration instead of failing on the first request.
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  ENABLE_TEST_ROUTES: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  AI_PROVIDER: z.enum(['mock', 'claude']).default('mock'),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-4-5'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('✖ Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
