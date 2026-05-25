import type { FastifyInstance } from 'fastify';
import { WalletOwnershipError } from '@castrater/wallet';

export async function walletRoute(app: FastifyInstance) {
  app.post<{ Body: { appSlug?: string } }>(
    '/wallet/create',
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ ok: false, error: 'Authentication required' });
      }

      const created = await app.walletService.createAppWallet({
        userId: request.currentUser.id,
        appSlug: request.body?.appSlug ?? app.env.DEFAULT_APP_SLUG,
      });

      return reply.code(201).send({
        ok: true,
        data: {
          wallet: created.wallet,
          app: created.app,
          event: created.event,
        },
      });
    }
  );

  app.get('/wallets', async (request, reply) => {
    if (!request.currentUser) {
      return reply.code(401).send({ ok: false, error: 'Authentication required' });
    }
    const wallets = await app.walletService.listUserWallets(request.currentUser.id);
    return { ok: true, data: wallets };
  });

  app.get<{ Params: { walletId: string } }>('/wallet/:walletId', async (request, reply) => {
    if (!request.currentUser) {
      return reply.code(401).send({ ok: false, error: 'Authentication required' });
    }

    const wallet = await app.walletService.getWalletForUser(
      request.currentUser.id,
      request.params.walletId
    );
    if (!wallet) {
      return reply.code(404).send({ ok: false, error: 'Wallet not found' });
    }
    return { ok: true, data: wallet };
  });

  app.post<{ Params: { walletId: string }; Body: { message: string } }>(
    '/wallet/:walletId/sign-message',
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ ok: false, error: 'Authentication required' });
      }

      try {
        const result = await app.walletService.signMessageForUser({
          userId: request.currentUser.id,
          walletId: request.params.walletId,
          message: request.body.message,
          requestId: request.id,
        });
        return { ok: true, data: result };
      } catch (error) {
        if (error instanceof WalletOwnershipError) {
          return reply.code(404).send({ ok: false, error: error.message });
        }
        return reply.code(400).send({
          ok: false,
          error: error instanceof Error ? error.message : 'Signing failed',
        });
      }
    }
  );

  app.get<{ Params: { walletId: string } }>(
    '/wallet/:walletId/events',
    async (request, reply) => {
      if (!request.currentUser) {
        return reply.code(401).send({ ok: false, error: 'Authentication required' });
      }

      try {
        const events = await app.walletService.listWalletEvents(
          request.currentUser.id,
          request.params.walletId
        );
        return { ok: true, data: events };
      } catch (error) {
        if (error instanceof WalletOwnershipError) {
          return reply.code(404).send({ ok: false, error: error.message });
        }
        return reply.code(400).send({
          ok: false,
          error: error instanceof Error ? error.message : 'Failed to load wallet events',
        });
      }
    }
  );
}
