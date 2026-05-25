import type { FastifyInstance } from 'fastify';

export async function appsRoute(app: FastifyInstance) {
  app.post('/apps/default', async () => {
    const demoApp = await app.walletService.ensureApp(
      app.env.DEFAULT_APP_SLUG,
      app.env.DEFAULT_APP_NAME
    );
    return { ok: true, data: demoApp };
  });
}
