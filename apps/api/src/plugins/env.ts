import fp from 'fastify-plugin';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4001),
  HOST: z.string().default('127.0.0.1'),
  CORS_ORIGIN: z.string().default('http://localhost:4000'),
  DATABASE_URL: z.string().default('postgresql://postgres:changeme@localhost:5432/castrater'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  STORAGE_BASE_DIR: z.string().default('./storage'),
  LOG_LEVEL: z.string().default('info'),
  QKMS_URL: z.string().optional(),
  QKMS_API_KEY: z.string().optional(),
  WEBAUTHN_RP_ID: z.string().default('localhost'),
  WEBAUTHN_RP_NAME: z.string().default('castrater-app-kit'),
  WEBAUTHN_ORIGIN: z.string().default('http://localhost:4000'),
  SESSION_COOKIE_NAME: z.string().default('castrater_session'),
  SESSION_TTL_HOURS: z.coerce.number().default(168),
  AUTH_INSECURE_COOKIE: z.coerce.boolean().default(true),
  AUTH_CHALLENGE_TTL_SECONDS: z.coerce.number().default(300),
  DEFAULT_APP_SLUG: z.string().default('default'),
  DEFAULT_APP_NAME: z.string().default('Default Demo App'),
});

export type Env = z.infer<typeof EnvSchema>;

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
  }
}

export const envPlugin = fp<{ override?: Partial<Env> }>(async (app, opts) => {
  const result = EnvSchema.safeParse({
    ...process.env,
    ...opts.override,
  });

  if (!result.success) {
    app.log.error({ errors: result.error.flatten() }, 'Invalid environment variables');
    throw new Error('Invalid environment variables');
  }

  app.decorate('env', result.data);
});
