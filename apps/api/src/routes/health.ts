import type { FastifyInstance } from 'fastify';

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    const redisOk = await app.redis
      .ping()
      .then(() => true)
      .catch(() => false);

    return reply.code(redisOk ? 200 : 503).send({
      ok: redisOk,
      status: redisOk ? 'ok' : 'degraded',
      redis: redisOk ? 'ok' : 'unreachable',
      timestamp: new Date().toISOString(),
    });
  });
}
