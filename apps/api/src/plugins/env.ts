import fp from 'fastify-plugin';
import { z } from 'zod';
import {
  AUTH_PROVIDERS,
  CUSTODY_PROVIDERS,
  SESSION_PROVIDERS,
} from '@castrater/config';

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4001),
    HOST: z.string().default('127.0.0.1'),
    CORS_ORIGIN: z.string().default('http://localhost:4000'),
    DATABASE_URL: z.string().default('postgresql://postgres:changeme@localhost:5432/castrater'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    STORAGE_BASE_DIR: z.string().default('./storage'),
    LOG_LEVEL: z.string().default('info'),
    QUILIBRIUM_QKMS_SERVER: z.string().optional(),
    QUILIBRIUM_QNZM_SERVER: z.string().optional(),
    QUILIBRIUM_APP_ID: z.string().optional(),
    QUILIBRIUM_APP_SECRET: z.string().optional(),
    AUTH_PROVIDER: z.enum(AUTH_PROVIDERS).default('passkey'),
    SESSION_PROVIDER: z.enum(SESSION_PROVIDERS).default('cookie'),
    CUSTODY_PROVIDER: z.enum(CUSTODY_PROVIDERS).default('local'),
    LOCAL_CUSTODY_SECRET: z.string().default('change-me-local-custody-secret'),
    DEMO_USER_EMAIL: z.string().default('demo@example.com'),
    DEMO_USER_DISPLAY_NAME: z.string().default('Demo User'),
    WEBAUTHN_RP_ID: z.string().default('localhost'),
    WEBAUTHN_RP_NAME: z.string().default('castrater-app-kit'),
    WEBAUTHN_ORIGIN: z.string().default('http://localhost:4000'),
    SESSION_COOKIE_NAME: z.string().default('castrater_session'),
    SESSION_TTL_HOURS: z.coerce.number().default(168),
    AUTH_INSECURE_COOKIE: z.coerce.boolean().default(true),
    AUTH_CHALLENGE_TTL_SECONDS: z.coerce.number().default(300),
    DEFAULT_APP_SLUG: z.string().default('default'),
    DEFAULT_APP_NAME: z.string().default('Default Demo App'),
  })
  .superRefine((value, ctx) => {
    if (value.AUTH_PROVIDER === 'passkey' && value.SESSION_PROVIDER !== 'cookie') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SESSION_PROVIDER'],
        message: 'Passkey auth currently requires cookie sessions',
      });
    }

    if (
      value.CUSTODY_PROVIDER === 'quilibrium-sdk' &&
      (!value.QUILIBRIUM_QKMS_SERVER ||
        !value.QUILIBRIUM_QNZM_SERVER ||
        !value.QUILIBRIUM_APP_ID ||
        !value.QUILIBRIUM_APP_SECRET)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CUSTODY_PROVIDER'],
        message:
          'quilibrium-sdk custody requires QUILIBRIUM_QKMS_SERVER, QUILIBRIUM_QNZM_SERVER, QUILIBRIUM_APP_ID, and QUILIBRIUM_APP_SECRET',
      });
    }
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
