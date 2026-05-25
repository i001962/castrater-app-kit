import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { apps } from '@castrater/db';
import { createQkmsClient } from '@castrater/qkms';
import { DbWalletService } from '@castrater/wallet';

const qkmsClient = createQkmsClient();

function getWalletService(app: FastifyInstance) {
  if (!app.db) {
    throw new Error('Database is required');
  }
  return new DbWalletService(app.db, qkmsClient);
}

const DEFAULT_APP_SLUG = 'default-demo-app';

export async function walletRoute(app: FastifyInstance) {
  app.post('/apps/default', async (_req, reply) => {
    if (!app.db) {
      return reply.code(500).send({ ok: false, error: 'Database is required' });
    }

    const existing = (await app.db.select().from(apps).where(eq(apps.slug, DEFAULT_APP_SLUG)).limit(1))[0];
    if (existing) {
      return { ok: true, data: existing };
    }

    const inserted = await app.db
      .insert(apps)
      .values({
        slug: DEFAULT_APP_SLUG,
        name: 'Default Demo App',
      })
      .onConflictDoNothing()
      .returning();

    if (inserted[0]) {
      return reply.code(201).send({ ok: true, data: inserted[0] });
    }

    const fallback = (
      await app.db.select().from(apps).where(eq(apps.slug, DEFAULT_APP_SLUG)).limit(1)
    )[0];
    return { ok: true, data: fallback };
  });

  app.post<{ Body: { appSlug?: string } }>(
    '/wallet/create',
    { preHandler: app.requireAuth },
    async (req, reply) => {
      if (!req.authUserId) {
        return reply.code(401).send({ ok: false, error: 'Unauthorized' });
      }
      try {
        const service = getWalletService(app);
        const wallet = await service.createAppWallet({
          userId: req.authUserId,
          appSlug: req.body.appSlug ?? DEFAULT_APP_SLUG,
        });
        return reply.code(201).send({ ok: true, data: wallet });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create wallet';
        return reply.code(400).send({ ok: false, error: message });
      }
    }
  );

  app.get('/wallets', { preHandler: app.requireAuth }, async (req, reply) => {
    if (!req.authUserId) {
      return reply.code(401).send({ ok: false, error: 'Unauthorized' });
    }
    try {
      const service = getWalletService(app);
      const wallets = await service.listUserWallets(req.authUserId);
      return { ok: true, data: wallets };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list wallets';
      return reply.code(400).send({ ok: false, error: message });
    }
  });

  app.get<{ Params: { walletId: string } }>(
    '/wallet/:walletId',
    { preHandler: app.requireAuth },
    async (req, reply) => {
      if (!req.authUserId) {
        return reply.code(401).send({ ok: false, error: 'Unauthorized' });
      }

      const service = getWalletService(app);
      const wallet = await service.getWalletForUser(req.authUserId, req.params.walletId);
      if (!wallet) {
        return reply.code(404).send({ ok: false, error: 'Wallet not found' });
      }
      return { ok: true, data: wallet };
    }
  );

  app.post<{ Params: { walletId: string }; Body: { message: string } }>(
    '/wallet/:walletId/sign-message',
    { preHandler: app.requireAuth },
    async (req, reply) => {
      if (!req.authUserId) {
        return reply.code(401).send({ ok: false, error: 'Unauthorized' });
      }
      if (!req.body.message || req.body.message.trim().length === 0) {
        return reply.code(400).send({ ok: false, error: 'message is required' });
      }

      try {
        const service = getWalletService(app);
        const signed = await service.signMessageForUser({
          userId: req.authUserId,
          walletId: req.params.walletId,
          message: req.body.message,
          requestId: randomUUID(),
        });
        return { ok: true, data: signed };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sign message';
        return reply.code(400).send({ ok: false, error: message });
      }
    }
  );

  app.get<{ Params: { walletId: string } }>(
    '/wallet/:walletId/events',
    { preHandler: app.requireAuth },
    async (req, reply) => {
      if (!req.authUserId) {
        return reply.code(401).send({ ok: false, error: 'Unauthorized' });
      }
      try {
        const service = getWalletService(app);
        const events = await service.listWalletEventsForUser(req.authUserId, req.params.walletId);
        return { ok: true, data: events };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to list wallet events';
        const notFound = message.toLowerCase().includes('not found');
        return reply.code(notFound ? 404 : 400).send({ ok: false, error: message });
      }
    }
  );
}
