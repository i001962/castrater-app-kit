import { createHash, randomBytes } from 'node:crypto';
import fp from 'fastify-plugin';
import cookie from '@fastify/cookie';
import { and, eq, gt } from 'drizzle-orm';
import { sessions } from '@castrater/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

type ChallengeScope = 'register' | 'login';

declare module 'fastify' {
  interface FastifyRequest {
    authUserId?: string;
    authSessionId?: string;
  }

  interface FastifyInstance {
    createSession: (userId: string) => Promise<{ token: string; expiresAt: Date }>;
    deleteSessionByToken: (token: string) => Promise<void>;
    setSessionCookie: (reply: FastifyReply, token: string, expiresAt: Date) => void;
    clearSessionCookie: (reply: FastifyReply) => void;
    storeChallenge: (scope: ChallengeScope, challenge: string, payload: Record<string, unknown>) => Promise<void>;
    consumeChallenge: (
      scope: ChallengeScope,
      challenge: string
    ) => Promise<Record<string, unknown> | null>;
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const fallbackChallenges = new Map<string, { payload: Record<string, unknown>; expiresAt: number }>();

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export const authPlugin = fp(async (app) => {
  await app.register(cookie);

  app.decorateRequest('authUserId', undefined);
  app.decorateRequest('authSessionId', undefined);

  app.decorate('setSessionCookie', (reply: FastifyReply, token: string, expiresAt: Date) => {
    reply.setCookie(app.env.AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: app.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
  });

  app.decorate('clearSessionCookie', (reply: FastifyReply) => {
    reply.clearCookie(app.env.AUTH_COOKIE_NAME, { path: '/' });
  });

  app.decorate('createSession', async (userId: string) => {
    if (!app.db) {
      throw new Error('Database is required for auth sessions');
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + app.env.AUTH_SESSION_TTL_SECONDS * 1000);
    await app.db.insert(sessions).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    });
    return { token, expiresAt };
  });

  app.decorate('deleteSessionByToken', async (token: string) => {
    if (!app.db) {
      return;
    }
    await app.db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  });

  app.decorate(
    'storeChallenge',
    async (scope: ChallengeScope, challenge: string, payload: Record<string, unknown>) => {
      const key = `webauthn:challenge:${scope}:${challenge}`;
      const ttlSeconds = 300;
      const value = JSON.stringify(payload);
      try {
        await app.redis.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {
        fallbackChallenges.set(key, { payload, expiresAt: Date.now() + ttlSeconds * 1000 });
      }
    }
  );

  app.decorate('consumeChallenge', async (scope: ChallengeScope, challenge: string) => {
    const key = `webauthn:challenge:${scope}:${challenge}`;
    try {
      const value = await app.redis.get(key);
      if (!value) {
        return null;
      }
      await app.redis.del(key);
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      const existing = fallbackChallenges.get(key);
      if (!existing) {
        return null;
      }
      if (existing.expiresAt < Date.now()) {
        fallbackChallenges.delete(key);
        return null;
      }
      fallbackChallenges.delete(key);
      return existing.payload;
    }
  });

  app.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!app.db) {
      return reply.code(500).send({ ok: false, error: 'Database is required' });
    }
    const token = request.cookies[app.env.AUTH_COOKIE_NAME];
    if (!token) {
      return reply.code(401).send({ ok: false, error: 'Unauthorized' });
    }
    const now = new Date();
    const rows = await app.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)))
      .limit(1);

    const session = rows[0];
    if (!session) {
      app.clearSessionCookie(reply);
      return reply.code(401).send({ ok: false, error: 'Unauthorized' });
    }
    request.authUserId = session.userId;
    request.authSessionId = session.id;
  });
});

