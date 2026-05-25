import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Db } from '@castrater/db';
import type { QkmsClient } from '@castrater/qkms';
import { envPlugin, type Env } from './plugins/env.js';
import { dbPlugin } from './plugins/db.js';
import { redisPlugin, type RedisClientLike } from './plugins/redis.js';
import { authPlugin } from './plugins/auth.js';
import { healthRoute } from './routes/health.js';
import { authRoute } from './routes/auth.js';
import { appsRoute } from './routes/apps.js';
import { walletRoute } from './routes/wallet.js';
import { statusRoute } from './routes/status.js';

export interface BuildAppOptions {
  env?: Partial<Env>;
  db?: Db;
  redis?: RedisClientLike | null;
  qkms?: QkmsClient;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
  });

  await app.register(envPlugin, { override: options.env });
  await app.register(cookie);
  await app.register(cors, {
    origin: app.env.CORS_ORIGIN,
    credentials: true,
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(dbPlugin, { db: options.db });
  await app.register(redisPlugin, { redis: options.redis });
  await app.register(authPlugin, { qkms: options.qkms });

  await app.register(healthRoute);
  await app.register(statusRoute, { prefix: '/v1' });
  await app.register(authRoute, { prefix: '/v1' });
  await app.register(appsRoute, { prefix: '/v1' });
  await app.register(walletRoute, { prefix: '/v1' });

  return app;
}
