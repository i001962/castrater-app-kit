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
          redis: true,
          postgres: Boolean(app.env.DATABASE_URL),
          qkms: Boolean(app.env.QKMS_URL),
          inference: app.env.INFERENCE_MODE,
        },
      },
    };
  });
}
