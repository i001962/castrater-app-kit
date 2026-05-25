import type { FastifyInstance } from 'fastify';

export async function healthRoute(app: FastifyInstance) {
  app.get('/health', async (_req, reply) => {
    const redisOk = await app.redis
      .ping()
      .then(() => true)
      .catch(() => false);
    const dbOk = Boolean(app.db);

    const ok = redisOk && dbOk;
    return reply.code(ok ? 200 : 503).send({
      ok,
      status: ok ? 'ok' : 'degraded',
      redis: redisOk ? 'ok' : 'unreachable',
      db: dbOk ? 'ok' : 'unconfigured',
      qkmsMode: app.env.QKMS_URL ? 'remote' : 'mock-dev-only',
      auth: 'webauthn-passkey',
      timestamp: new Date().toISOString(),
    });
  });
}
