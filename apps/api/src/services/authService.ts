import crypto from 'node:crypto';
import type { FastifyReply } from 'fastify';
import { and, eq, gt, sql } from 'drizzle-orm';
import {
  passkeyCredentials,
  sessions,
  type Db,
  users,
} from '@castrater/db';
import {
  type AuthenticationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
  type GenerateAuthenticationOptionsOpts,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import type { Env } from '../plugins/env.js';
import type { ChallengeStore } from '../lib/challengeStore.js';
import { createSessionToken, hashSessionToken } from '../lib/session.js';

type PendingRegistration = {
  kind: 'registration';
  userId: string;
  email: string | null;
  displayName: string | null;
};

type PendingAuthentication = {
  kind: 'authentication';
  userId: string | null;
};

type PendingChallenge = PendingRegistration | PendingAuthentication;

export type RegistrationVerifyBody = {
  response: RegistrationResponseJSON;
  displayName?: string;
  email?: string;
};

export type AuthenticationVerifyBody = {
  response: AuthenticationResponseJSON;
};

function parseChallengeFromClientData(clientDataJSON: string) {
  const decoded = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString('utf8')) as {
    challenge: string;
  };
  return decoded.challenge;
}

function normalizeTransports(
  transports: unknown
): AuthenticatorTransportFuture[] | undefined {
  if (!Array.isArray(transports)) {
    return undefined;
  }

  const allowed = new Set<AuthenticatorTransportFuture>([
    'ble',
    'cable',
    'hybrid',
    'internal',
    'nfc',
    'smart-card',
    'usb',
  ]);

  const normalized = transports.filter(
    (transport): transport is AuthenticatorTransportFuture =>
      typeof transport === 'string' && allowed.has(transport as AuthenticatorTransportFuture)
  );

  return normalized.length ? normalized : undefined;
}

async function persistSession(
  db: Db,
  env: Env,
  reply: FastifyReply,
  userId: string
) {
  if (env.SESSION_PROVIDER === 'none') {
    return;
  }

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt,
  });

  reply.setCookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !env.AUTH_INSECURE_COOKIE,
    path: '/',
    expires: expiresAt,
  });
}

export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly env: Env,
    private readonly challenges: ChallengeStore
  ) {}

  async createRegistrationOptions(input: { displayName?: string; email?: string }) {
    const userId = crypto.randomUUID();
    const email = input.email?.trim().toLowerCase() || null;
    const displayName = input.displayName?.trim() || email || 'New user';

    const options = await generateRegistrationOptions({
      rpID: this.env.WEBAUTHN_RP_ID,
      rpName: this.env.WEBAUTHN_RP_NAME,
      userID: new TextEncoder().encode(userId),
      userName: email ?? `user-${userId.slice(0, 8)}`,
      userDisplayName: displayName,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    await this.storeChallenge(options.challenge, {
      kind: 'registration',
      userId,
      email,
      displayName,
    });

    return options;
  }

  async verifyRegistration(body: RegistrationVerifyBody, reply: FastifyReply) {
    const challenge = parseChallengeFromClientData(body.response.response.clientDataJSON);
    const pending = await this.loadChallenge(challenge);
    if (!pending || pending.kind !== 'registration') {
      throw new Error('Registration challenge not found or expired');
    }

    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: this.env.WEBAUTHN_ORIGIN,
      expectedRPID: this.env.WEBAUTHN_RP_ID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('Registration verification failed');
    }

    const [user] = await this.db
      .insert(users)
      .values({
        id: pending.userId,
        displayName: body.displayName?.trim() || pending.displayName,
        email: body.email?.trim().toLowerCase() || pending.email,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          displayName: body.displayName?.trim() || pending.displayName,
          email: body.email?.trim().toLowerCase() || pending.email,
          updatedAt: new Date(),
        },
      })
      .returning();

    await this.db.insert(passkeyCredentials).values({
      id: crypto.randomUUID(),
      userId: user.id,
      credentialId: verification.registrationInfo.credential.id,
      publicKey: Buffer.from(verification.registrationInfo.credential.publicKey).toString(
        'base64url'
      ),
      counter: verification.registrationInfo.credential.counter,
      transports: body.response.response.transports ?? null,
      backedUp: verification.registrationInfo.credentialBackedUp,
      deviceType: verification.registrationInfo.credentialDeviceType,
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    });

    await this.deleteChallenge(challenge);
    await persistSession(this.db, this.env, reply, user.id);
    return user;
  }

  async createAuthenticationOptions(input: { email?: string; userId?: string }) {
    let resolvedUserId = input.userId ?? null;

    if (!resolvedUserId && input.email) {
      const user = await this.db.query.users.findFirst({
        where: eq(users.email, input.email.trim().toLowerCase()),
      });
      resolvedUserId = user?.id ?? null;
    }

    const allowCredentials = resolvedUserId
      ? await this.lookupAllowCredentials(resolvedUserId)
      : undefined;

    const options = await generateAuthenticationOptions({
      rpID: this.env.WEBAUTHN_RP_ID,
      userVerification: 'preferred',
      allowCredentials,
    } satisfies GenerateAuthenticationOptionsOpts);

    await this.storeChallenge(options.challenge, {
      kind: 'authentication',
      userId: resolvedUserId,
    });

    return options;
  }

  async verifyAuthentication(body: AuthenticationVerifyBody, reply: FastifyReply) {
    const challenge = parseChallengeFromClientData(body.response.response.clientDataJSON);
    const pending = await this.loadChallenge(challenge);
    if (!pending || pending.kind !== 'authentication') {
      throw new Error('Authentication challenge not found or expired');
    }

    const credentialId = body.response.id;
    const credential = await this.db.query.passkeyCredentials.findFirst({
      where: eq(passkeyCredentials.credentialId, credentialId),
    });
    if (!credential) {
      throw new Error('Credential not recognized');
    }

    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge,
      expectedOrigin: this.env.WEBAUTHN_ORIGIN,
      expectedRPID: this.env.WEBAUTHN_RP_ID,
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, 'base64url'),
        counter: credential.counter,
        transports: normalizeTransports(credential.transports),
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      throw new Error('Authentication verification failed');
    }

    await this.db
      .update(passkeyCredentials)
      .set({
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(passkeyCredentials.id, credential.id));

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, credential.userId),
    });
    if (!user) {
      throw new Error('Credential user not found');
    }

    await this.deleteChallenge(challenge);
    await persistSession(this.db, this.env, reply, user.id);
    return user;
  }

  async getUserFromSessionToken(token?: string | null) {
    if (this.env.SESSION_PROVIDER === 'none') {
      return null;
    }

    if (!token) {
      return null;
    }

    const tokenHash = hashSessionToken(token);
    const rows = await this.db
      .select({
        userId: users.id,
        userDisplayName: users.displayName,
        userEmail: users.email,
        sessionId: sessions.id,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      sessionId: row.sessionId,
      user: {
        id: row.userId,
        displayName: row.userDisplayName,
        email: row.userEmail,
      },
    };
  }

  async logout(token: string | undefined, reply: FastifyReply) {
    if (this.env.SESSION_PROVIDER === 'none') {
      reply.clearCookie(this.env.SESSION_COOKIE_NAME, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: !this.env.AUTH_INSECURE_COOKIE,
      });
      return;
    }

    if (token) {
      await this.db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
    }

    reply.clearCookie(this.env.SESSION_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: !this.env.AUTH_INSECURE_COOKIE,
    });
  }

  async cleanupExpiredSessions() {
    if (this.env.SESSION_PROVIDER === 'none') {
      return;
    }
    await this.db.delete(sessions).where(sql`${sessions.expiresAt} <= now()`);
  }

  async ensureDemoUser() {
    const email = this.env.DEMO_USER_EMAIL.trim().toLowerCase();
    const displayName = this.env.DEMO_USER_DISPLAY_NAME.trim();

    const existing = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return existing;
    }

    const [user] = await this.db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email,
        displayName,
      })
      .returning();

    return user;
  }

  private async lookupAllowCredentials(userId: string) {
    const credentials = await this.db.query.passkeyCredentials.findMany({
      where: eq(passkeyCredentials.userId, userId),
    });

    return credentials.map((credential) => ({
      id: credential.credentialId,
      transports: normalizeTransports(credential.transports),
    }));
  }

  private async storeChallenge(challenge: string, payload: PendingChallenge) {
    await this.challenges.set(
      `webauthn:challenge:${challenge}`,
      JSON.stringify(payload),
      this.env.AUTH_CHALLENGE_TTL_SECONDS
    );
  }

  private async loadChallenge(challenge: string) {
    const raw = await this.challenges.get(`webauthn:challenge:${challenge}`);
    return raw ? (JSON.parse(raw) as PendingChallenge) : null;
  }

  private async deleteChallenge(challenge: string) {
    await this.challenges.delete(`webauthn:challenge:${challenge}`);
  }
}

export type RegistrationOptionsResponse = PublicKeyCredentialCreationOptionsJSON;
export type AuthenticationOptionsResponse = PublicKeyCredentialRequestOptionsJSON;
