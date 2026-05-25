import fp from 'fastify-plugin';
import IORedis from 'ioredis';

export interface RedisClientLike {
  connect(): Promise<unknown>;
  quit(): Promise<unknown>;
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

declare module 'fastify' {
  interface FastifyInstance {
    redis: RedisClientLike | null;
  }
}

export const redisPlugin = fp<{ redis?: RedisClientLike | null }>(async (app, opts) => {
  if (opts.redis !== undefined) {
    app.decorate('redis', opts.redis);
    return;
  }

  const redis = new (IORedis as unknown as {
    new (url: string, options: {
      maxRetriesPerRequest: null;
      lazyConnect: true;
    }): RedisClientLike;
  })(app.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    app.decorate('redis', redis);
    app.addHook('onClose', async () => {
      await redis.quit();
    });
  } catch (error) {
    app.log.warn({ err: error }, 'Redis unavailable, using in-memory auth challenge store');
    app.decorate('redis', null);
  }
});
