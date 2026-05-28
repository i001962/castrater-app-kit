import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { QkmsClient } from '@castrater/qkms';
import { createQkmsClient } from '@castrater/qkms';
import { WalletService } from '@castrater/wallet';
import { LocalCustodyClient } from '../lib/localCustody.js';
import type { ChallengeStore } from '../lib/challengeStore.js';
import { MemoryChallengeStore } from '../lib/challengeStore.js';
import type { RedisClientLike } from './redis.js';
import { AuthService } from '../services/authService.js';

declare module 'fastify' {
  interface FastifyInstance {
    auth: AuthService;
    walletService: WalletService;
    qkms: QkmsClient;
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    currentUser: { id: string; displayName: string | null; email: string | null } | null;
    sessionId: string | null;
  }
}

class RedisChallengeStore implements ChallengeStore {
  constructor(private readonly redis: RedisClientLike) {}

  async set(key: string, payload: string, ttlSeconds: number) {
    await this.redis.set(key, payload, 'EX', ttlSeconds);
  }

  async get(key: string) {
    return this.redis.get(key);
  }

  async delete(key: string) {
    await this.redis.del(key);
  }
}

export const authPlugin = fp<{ qkms?: QkmsClient }>(async (app, opts) => {
  const challengeStore =
    app.redis !== null ? new RedisChallengeStore(app.redis) : new MemoryChallengeStore();
  const qkms =
    opts.qkms ??
    (app.env.CUSTODY_PROVIDER === 'local'
      ? new LocalCustodyClient(app.db, app.env.LOCAL_CUSTODY_SECRET)
      : createQkmsClient({
          mode: app.env.CUSTODY_PROVIDER === 'quilibrium-sdk' ? 'quilibrium-sdk' : 'mock',
          quilSdk: {
            qkmsServer: app.env.QUILIBRIUM_QKMS_SERVER,
            qnzmServer: app.env.QUILIBRIUM_QNZM_SERVER,
            appId: app.env.QUILIBRIUM_APP_ID,
            appSecret: app.env.QUILIBRIUM_APP_SECRET,
          },
        }));
  const auth = new AuthService(app.db, app.env, challengeStore);
  const walletService = new WalletService({ db: app.db, qkms });

  app.decorate('auth', auth);
  app.decorate('walletService', walletService);
  app.decorate('qkms', qkms);

  app.decorateRequest('currentUser', null);
  app.decorateRequest('sessionId', null);

  app.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.currentUser) {
      reply.code(401).send({ ok: false, error: 'Authentication required' });
    }
  });

  app.addHook('onRequest', async (request) => {
    if (app.env.AUTH_PROVIDER === 'demo') {
      const demoUser = await auth.ensureDemoUser();
      request.currentUser = {
        id: demoUser.id,
        displayName: demoUser.displayName,
        email: demoUser.email,
      };
      request.sessionId = null;
      return;
    }

    const token = request.cookies[app.env.SESSION_COOKIE_NAME];
    const session = await auth.getUserFromSessionToken(token);
    request.currentUser = session?.user ?? null;
    request.sessionId = session?.sessionId ?? null;
  });
});
