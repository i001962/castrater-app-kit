import type { FastifyInstance } from 'fastify';
import { MockWalletService } from '@castrater/wallet';
import { createQkmsClient } from '@castrater/qkms';

// Singleton wallet service (in production, use dependency injection or a real DB-backed service)
let walletService: MockWalletService | null = null;
function getWalletService() {
  if (!walletService) {
    const qkms = createQkmsClient();
    walletService = new MockWalletService(qkms);
  }
  return walletService;
}

export async function walletRoute(app: FastifyInstance) {
  app.post<{ Body: { userId: string; appId: string } }>(
    '/wallet/create',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'appId'],
          properties: {
            userId: { type: 'string' },
            appId: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const service = getWalletService();
      const wallet = await service.createAppWallet(req.body.userId, req.body.appId);
      return reply.code(201).send({ ok: true, data: wallet });
    }
  );

  app.get<{ Params: { walletId: string } }>('/wallet/:walletId', async (req, reply) => {
    const service = getWalletService();
    const wallet = await service.getWallet(req.params.walletId);
    if (!wallet) return reply.code(404).send({ ok: false, error: 'Wallet not found' });
    return { ok: true, data: wallet };
  });

  app.post<{ Body: { walletId: string; payload: string } }>(
    '/wallet/sign',
    {
      schema: {
        body: {
          type: 'object',
          required: ['walletId', 'payload'],
          properties: {
            walletId: { type: 'string' },
            payload: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const service = getWalletService();
      try {
        const result = await service.signWithPolicy(req.body.walletId, req.body.payload);
        return { ok: true, data: result };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign failed';
        return reply.code(400).send({ ok: false, error: message });
      }
    }
  );
}
