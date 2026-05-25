import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    const redisOk = app.redis
      ? await app.redis
          .ping()
          .then(() => true)
          .catch(() => false)
      : false;

    const dbOk = await app.db
      .execute(sql`select 1`)
      .then(() => true)
      .catch(() => false);

    const ok = dbOk;

    return reply.code(ok ? 200 : 503).send({
      ok,
      status: ok ? 'ok' : 'degraded',
      db: dbOk ? 'ok' : 'unreachable',
      redis: redisOk ? 'ok' : app.redis === null ? 'memory-fallback' : 'unreachable',
      timestamp: new Date().toISOString(),
    });
  });
}
