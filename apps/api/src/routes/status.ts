import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getQkmsStatus } from '@castrater/qkms';

export async function statusRoute(app: FastifyInstance) {
  app.get('/status', async () => {
    const dbStatus = await app.db
      .execute(sql`select 1`)
      .then(() => 'ok')
      .catch(() => 'unreachable');

    const redisStatus = app.redis
      ? await app.redis
          .ping()
          .then(() => 'ok')
          .catch(() => 'unreachable')
      : 'memory-fallback';

    const qkms = getQkmsStatus();

    return {
      ok: true,
      data: {
        authEnabled: true,
        db: dbStatus,
        redis: redisStatus,
        qkms,
        webauthn: {
          rpId: app.env.WEBAUTHN_RP_ID,
          origin: app.env.WEBAUTHN_ORIGIN,
        },
      },
    };
  });
}
