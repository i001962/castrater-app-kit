import fp from 'fastify-plugin';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4001),
  HOST: z.string().default('127.0.0.1'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string().optional(),
  QKMS_URL: z.string().optional(),
  QKMS_API_KEY: z.string().optional(),
  HYPERSNAP_URL: z.string().default('https://hypersnap.castrater.xyz'),
  INFERENCE_MODE: z.enum(['mock', 'local', 'remote']).default('mock'),
  STORAGE_BASE_DIR: z.string().default('/app/storage'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().default('*'),
});

export type Env = z.infer<typeof EnvSchema>;

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
  }
}

export const envPlugin = fp(async (app) => {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    app.log.error({ errors: result.error.flatten() }, 'Invalid environment variables');
    process.exit(1);
  }
  app.decorate('env', result.data);
});
