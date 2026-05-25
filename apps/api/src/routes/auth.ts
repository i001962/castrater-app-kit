import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { and, eq } from 'drizzle-orm';
import { passkeyCredentials, users } from '@castrater/db';

function parseChallenge(clientDataJSON: string): string {
  const decoded = Buffer.from(clientDataJSON, 'base64url').toString('utf8');
  const payload = JSON.parse(decoded) as { challenge: string };
  return payload.challenge;
}

function normalizeEmail(email?: string): string | undefined {
  if (!email) {
    return undefined;
  }
  return email.trim().toLowerCase();
}

function normalizeTransports(
  transports: string[] | null
): AuthenticatorTransportFuture[] | undefined {
  if (!transports || transports.length === 0) {
    return undefined;
  }
  const allowed: AuthenticatorTransportFuture[] = ['ble', 'hybrid', 'internal', 'nfc', 'usb'];
  const filtered = transports.filter((value): value is AuthenticatorTransportFuture =>
    allowed.includes(value as AuthenticatorTransportFuture)
  );
  return filtered.length > 0 ? filtered : undefined;
}

export async function authRoute(app: FastifyInstance) {
  app.post<{ Body: { displayName?: string; email?: string } }>(
    '/auth/register/options',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
      if (!app.db) {
        return reply.code(500).send({ ok: false, error: 'Database is required' });
      }

      const email = normalizeEmail(req.body.email);
      const existingUser =
        email === undefined
          ? null
          : (
              await app.db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1)
            )[0] ?? null;
      const userId = existingUser?.id ?? randomUUID();
      const userName = email ?? `user-${userId.slice(0, 8)}`;

      const options = await generateRegistrationOptions({
        rpName: app.env.WEBAUTHN_RP_NAME,
        rpID: app.env.WEBAUTHN_RP_ID,
        userID: Buffer.from(userId),
        userName,
        userDisplayName: req.body.displayName ?? userName,
        attestationType: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      await app.storeChallenge('register', options.challenge, {
        userId,
        displayName: req.body.displayName ?? null,
        email: email ?? null,
      });

      return { ok: true, data: options };
    }
  );

  app.post<{
    Body: {
      response: {
        id: string;
        response: { clientDataJSON: string };
      } & RegistrationResponseJSON;
      displayName?: string;
      email?: string;
    };
  }>(
    '/auth/register/verify',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
    if (!app.db) {
      return reply.code(500).send({ ok: false, error: 'Database is required' });
    }

    const challenge = parseChallenge(req.body.response.response.clientDataJSON);
    const challengeData = await app.consumeChallenge('register', challenge);
    if (!challengeData) {
      return reply.code(400).send({ ok: false, error: 'Registration challenge not found or expired' });
    }

    const verification = await verifyRegistrationResponse({
      response: req.body.response,
      expectedChallenge: challenge,
      expectedOrigin: app.env.WEBAUTHN_ORIGIN,
      expectedRPID: app.env.WEBAUTHN_RP_ID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return reply.code(400).send({ ok: false, error: 'Passkey registration verification failed' });
    }

    const userId = String(challengeData['userId']);
    const email = normalizeEmail(
      (challengeData['email'] as string | null | undefined) ?? req.body.email
    );
    const displayName =
      (challengeData['displayName'] as string | null | undefined) ?? req.body.displayName ?? null;

    const userRows = await app.db.select().from(users).where(eq(users.id, userId)).limit(1);
    let user = userRows[0] ?? null;
    if (!user) {
      const inserted = await app.db
        .insert(users)
        .values({ id: userId, email, displayName })
        .returning();
      user = inserted[0] ?? null;
    } else {
      const updated = await app.db
        .update(users)
        .set({ email: email ?? user.email, displayName: displayName ?? user.displayName, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      user = updated[0] ?? user;
    }

    if (!user) {
      return reply.code(500).send({ ok: false, error: 'Failed to persist user' });
    }

    const credential = verification.registrationInfo.credential;
    await app.db
      .insert(passkeyCredentials)
      .values({
        userId: user.id,
        credentialId: credential.id,
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? null,
        backedUp: verification.registrationInfo.credentialBackedUp,
        deviceType: verification.registrationInfo.credentialDeviceType ?? null,
      })
      .onConflictDoUpdate({
        target: passkeyCredentials.credentialId,
        set: {
          userId: user.id,
          publicKey: isoBase64URL.fromBuffer(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports ?? null,
          backedUp: verification.registrationInfo.credentialBackedUp,
          deviceType: verification.registrationInfo.credentialDeviceType ?? null,
          updatedAt: new Date(),
          lastUsedAt: new Date(),
        },
      });

    const session = await app.createSession(user.id);
    app.setSessionCookie(reply, session.token, session.expiresAt);
      return { ok: true, data: { user } };
    }
  );

  app.post<{ Body: { email?: string; userId?: string } }>(
    '/auth/login/options',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
      if (!app.db) {
        return reply.code(500).send({ ok: false, error: 'Database is required' });
      }

      const email = normalizeEmail(req.body.email);
      let userId = req.body.userId;
      if (!userId && email) {
        const user = (await app.db.select().from(users).where(eq(users.email, email)).limit(1))[0];
        userId = user?.id;
      }

      const allowCredentials =
        userId === undefined
          ? undefined
          : (
              await app.db
                .select()
                .from(passkeyCredentials)
                .where(eq(passkeyCredentials.userId, userId))
            ).map((row) => ({
              id: row.credentialId,
                transports: normalizeTransports(row.transports),
            }));

      const options = await generateAuthenticationOptions({
        rpID: app.env.WEBAUTHN_RP_ID,
        userVerification: 'preferred',
        allowCredentials,
      });

      await app.storeChallenge('login', options.challenge, { userId: userId ?? null });
      return { ok: true, data: options };
    }
  );

  app.post<{
    Body: {
      response: Record<string, unknown> & {
        id: string;
        response: { clientDataJSON: string };
      } & AuthenticationResponseJSON;
    };
  }>(
    '/auth/login/verify',
    {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (req, reply) => {
    if (!app.db) {
      return reply.code(500).send({ ok: false, error: 'Database is required' });
    }

    const challenge = parseChallenge(req.body.response.response.clientDataJSON);
    const challengeData = await app.consumeChallenge('login', challenge);
    if (!challengeData) {
      return reply.code(400).send({ ok: false, error: 'Login challenge not found or expired' });
    }

    const credentialRows = await app.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, req.body.response.id))
      .limit(1);
    const credential = credentialRows[0];
    if (!credential) {
      return reply.code(404).send({ ok: false, error: 'Credential not found' });
    }

    const expectedUserId = challengeData['userId'];
    if (typeof expectedUserId === 'string' && expectedUserId.length > 0 && expectedUserId !== credential.userId) {
      return reply.code(403).send({ ok: false, error: 'Credential does not match requested user' });
    }

    const verification = await verifyAuthenticationResponse({
      response: req.body.response,
      expectedChallenge: challenge,
      expectedOrigin: app.env.WEBAUTHN_ORIGIN,
      expectedRPID: app.env.WEBAUTHN_RP_ID,
      requireUserVerification: false,
      credential: {
        id: credential.credentialId,
        publicKey: isoBase64URL.toBuffer(credential.publicKey),
        counter: credential.counter,
        transports: normalizeTransports(credential.transports),
      },
    });

    if (!verification.verified) {
      return reply.code(400).send({ ok: false, error: 'Passkey login verification failed' });
    }

    await app.db
      .update(passkeyCredentials)
      .set({
        counter: verification.authenticationInfo.newCounter,
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      })
      .where(and(eq(passkeyCredentials.id, credential.id), eq(passkeyCredentials.userId, credential.userId)));

    const userRows = await app.db.select().from(users).where(eq(users.id, credential.userId)).limit(1);
    const user = userRows[0];
    if (!user) {
      return reply.code(404).send({ ok: false, error: 'User not found' });
    }

      const session = await app.createSession(user.id);
      app.setSessionCookie(reply, session.token, session.expiresAt);
      return { ok: true, data: { user } };
    }
  );

  app.post('/auth/logout', async (req, reply) => {
    const token = req.cookies[app.env.AUTH_COOKIE_NAME];
    if (token) {
      await app.deleteSessionByToken(token);
    }
    app.clearSessionCookie(reply);
    return { ok: true };
  });

  app.get('/auth/me', { preHandler: app.requireAuth }, async (req, reply) => {
    if (!app.db || !req.authUserId) {
      return reply.code(401).send({ ok: false, error: 'Unauthorized' });
    }
    const user = (await app.db.select().from(users).where(eq(users.id, req.authUserId)).limit(1))[0];
    if (!user) {
      return reply.code(401).send({ ok: false, error: 'Unauthorized' });
    }
    return { ok: true, data: { user } };
  });
}
