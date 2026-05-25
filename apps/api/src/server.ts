import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { envPlugin } from './plugins/env.js';
import { dbPlugin } from './plugins/db.js';
import { redisPlugin } from './plugins/redis.js';
import { authPlugin } from './plugins/auth.js';
import { healthRoute } from './routes/health.js';
import { infoRoute } from './routes/info.js';
import { farcasterRoute } from './routes/farcaster.js';
import { authRoute } from './routes/auth.js';
import { walletRoute } from './routes/wallet.js';

const app = Fastify({
  logger: {
    level: process.env['LOG_LEVEL'] ?? 'info',
    transport:
      process.env['NODE_ENV'] !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

async function start() {
  await app.register(envPlugin);
  await app.register(cors, { origin: process.env['CORS_ORIGIN'] ?? true, credentials: true });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(dbPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);

  await app.register(healthRoute);
  await app.register(infoRoute, { prefix: '/v1' });
  await app.register(authRoute, { prefix: '/v1' });
  await app.register(walletRoute, { prefix: '/v1' });
  await app.register(farcasterRoute, { prefix: '/v1' });

  const port = Number(process.env['PORT'] ?? 4001);
  const host = process.env['HOST'] ?? '127.0.0.1';

  await app.listen({ port, host });
  app.log.info(`API running at http://${host}:${port}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

