import fp from 'fastify-plugin';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin = fp(async (app) => {
  const redis = new Redis(app.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  await redis.connect().catch((err) => {
    app.log.warn({ err }, 'Redis connection failed — KV/queue features may be unavailable');
  });

  app.decorate('redis', redis);
  app.addHook('onClose', async () => {
    await redis.quit();
  });
});
