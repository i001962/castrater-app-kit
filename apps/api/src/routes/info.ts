import type { FastifyInstance } from 'fastify';
import { APP_NAME, APP_VERSION } from '@castrater/config';

export async function infoRoute(app: FastifyInstance) {
  app.get('/info', async (_req, _reply) => {
    return {
      ok: true,
      data: {
        name: APP_NAME,
        version: APP_VERSION,
        env: app.env.NODE_ENV,
        features: {
          auth: 'passkey',
          db: Boolean(app.env.DATABASE_URL),
          qkmsMode: app.env.QKMS_URL ? 'remote' : 'mock-dev-only',
          walletAudit: true,
          proofs: 'local-placeholder',
          optionalIntegrations: {
            hypersnapReadOnly: true,
            farcasterWrite: false,
            miniappVerify: false,
            remoteInference: false,
          },
        },
      },
    };
  });
}
