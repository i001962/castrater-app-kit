import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { envPlugin } from './plugins/env.js';
import { redisPlugin } from './plugins/redis.js';
import { queuesPlugin } from './plugins/queues.js';
import { healthRoute } from './routes/health.js';
import { infoRoute } from './routes/info.js';
import { kvRoute } from './routes/kv.js';
import { jobsRoute } from './routes/jobs.js';
import { farcasterRoute } from './routes/farcaster.js';
import { miniappRoute } from './routes/miniapp.js';
import { walletRoute } from './routes/wallet.js';
import { proofsRoute } from './routes/proofs.js';
import { storageRoute } from './routes/storage.js';
import { inferenceRoute } from './routes/inference.js';

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
  // Plugins
  await app.register(envPlugin);
  await app.register(cors, { origin: process.env['CORS_ORIGIN'] ?? '*' });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
  await app.register(redisPlugin);
  await app.register(queuesPlugin);

  // Routes
  await app.register(healthRoute);
  await app.register(infoRoute, { prefix: '/v1' });
  await app.register(kvRoute, { prefix: '/v1' });
  await app.register(jobsRoute, { prefix: '/v1' });
  await app.register(farcasterRoute, { prefix: '/v1' });
  await app.register(miniappRoute, { prefix: '/v1' });
  await app.register(walletRoute, { prefix: '/v1' });
  await app.register(proofsRoute, { prefix: '/v1' });
  await app.register(storageRoute, { prefix: '/v1' });
  await app.register(inferenceRoute, { prefix: '/v1' });

  const port = Number(process.env['PORT'] ?? 4001);
  const host = process.env['HOST'] ?? '127.0.0.1';

  await app.listen({ port, host });
  app.log.info(`API running at http://${host}:${port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
