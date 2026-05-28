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

    const custody =
      app.env.CUSTODY_PROVIDER === 'local'
        ? {
            mode: 'local',
            configured: Boolean(app.env.LOCAL_CUSTODY_SECRET),
          }
        : getQkmsStatus({
            mode: app.env.CUSTODY_PROVIDER === 'quilibrium-sdk' ? 'quilibrium-sdk' : 'mock',
            quilSdk: {
              qkmsServer: app.env.QUILIBRIUM_QKMS_SERVER,
              qnzmServer: app.env.QUILIBRIUM_QNZM_SERVER,
              appId: app.env.QUILIBRIUM_APP_ID,
              appSecret: app.env.QUILIBRIUM_APP_SECRET,
            },
          });

    return {
      ok: true,
      data: {
        authEnabled: app.env.AUTH_PROVIDER === 'passkey',
        db: dbStatus,
        redis: redisStatus,
        custody,
        scaffold: {
          authProvider: app.env.AUTH_PROVIDER,
          sessionProvider: app.env.SESSION_PROVIDER,
          custodyProvider: app.env.CUSTODY_PROVIDER,
        },
        webauthn: {
          rpId: app.env.WEBAUTHN_RP_ID,
          origin: app.env.WEBAUTHN_ORIGIN,
        },
      },
    };
  });
}
