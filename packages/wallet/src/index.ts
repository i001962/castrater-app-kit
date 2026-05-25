import crypto from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import {
  appAccounts,
  apps,
  appWallets,
  type Db,
  proofArtifacts,
  signingPolicies,
  users,
  walletEvents,
} from '@castrater/db';
import type { QkmsClient } from '@castrater/qkms';
import { hashPayload } from '@castrater/proofs';

export interface WalletPolicyDecision {
  allowed: boolean;
  reason?: string;
}

export interface WalletServiceOptions {
  db: Db;
  qkms: QkmsClient;
}

export interface CreateAppWalletInput {
  userId: string;
  appSlug?: string;
  appName?: string;
}

export interface SignMessageInput {
  userId: string;
  walletId: string;
  message: string;
  requestId?: string;
}

export class WalletOwnershipError extends Error {
  constructor() {
    super('Wallet not found for user');
  }
}

export class WalletService {
  constructor(private readonly opts: WalletServiceOptions) {}

  async ensureApp(slug = 'default', name = 'Default Demo App') {
    const existing = await this.opts.db.query.apps.findFirst({
      where: eq(apps.slug, slug),
    });
    if (existing) {
      return existing;
    }

    const created = await this.opts.db
      .insert(apps)
      .values({
        id: crypto.randomUUID(),
        slug,
        name,
      })
      .returning();

    return created[0];
  }

  async ensureAppAccount(userId: string, appSlug = 'default') {
    const app = await this.ensureApp(appSlug);
    const existing = await this.opts.db.query.appAccounts.findFirst({
      where: and(eq(appAccounts.userId, userId), eq(appAccounts.appId, app.id)),
    });

    if (existing) {
      return { app, appAccount: existing };
    }

    const [created] = await this.opts.db
      .insert(appAccounts)
      .values({
        id: crypto.randomUUID(),
        userId,
        appId: app.id,
        role: 'user',
      })
      .returning();

    return { app, appAccount: created };
  }

  async createAppWallet(input: CreateAppWalletInput) {
    const { app, appAccount } = await this.ensureAppAccount(input.userId, input.appSlug);
    const key = await this.opts.qkms.createKey({
      label: `${app.slug}:${appAccount.id}`,
      curve: 'secp256k1',
    });

    const [wallet] = await this.opts.db
      .insert(appWallets)
      .values({
        id: crypto.randomUUID(),
        appAccountId: appAccount.id,
        qkmsKeyId: key.keyId,
        address: key.address,
        chain: 'evm',
        status: 'active',
      })
      .returning();

    const event = await this.recordWalletEvent({
      walletId: wallet.id,
      eventType: 'wallet.created',
      metadata: { appSlug: app.slug, address: wallet.address },
    });

    return { app, appAccount, wallet, event };
  }

  async listUserWallets(userId: string) {
    return this.opts.db
      .select({
        walletId: appWallets.id,
        address: appWallets.address,
        chain: appWallets.chain,
        status: appWallets.status,
        createdAt: appWallets.createdAt,
        appSlug: apps.slug,
        appName: apps.name,
      })
      .from(appWallets)
      .innerJoin(appAccounts, eq(appWallets.appAccountId, appAccounts.id))
      .innerJoin(apps, eq(appAccounts.appId, apps.id))
      .where(eq(appAccounts.userId, userId))
      .orderBy(desc(appWallets.createdAt));
  }

  async getWalletForUser(userId: string, walletId: string) {
    const wallet = await this.opts.db
      .select({
        walletId: appWallets.id,
        address: appWallets.address,
        chain: appWallets.chain,
        status: appWallets.status,
        qkmsKeyId: appWallets.qkmsKeyId,
        createdAt: appWallets.createdAt,
        appAccountId: appAccounts.id,
        appSlug: apps.slug,
        appName: apps.name,
        policyId: appWallets.policyId,
      })
      .from(appWallets)
      .innerJoin(appAccounts, eq(appWallets.appAccountId, appAccounts.id))
      .innerJoin(apps, eq(appAccounts.appId, apps.id))
      .where(and(eq(appWallets.id, walletId), eq(appAccounts.userId, userId)))
      .limit(1);

    return wallet[0] ?? null;
  }

  async signMessageForUser(input: SignMessageInput) {
    const wallet = await this.getWalletForUser(input.userId, input.walletId);
    if (!wallet) {
      throw new WalletOwnershipError();
    }

    if (wallet.status !== 'active') {
      throw new Error('Wallet is not active');
    }

    const policy = await this.resolvePolicy(wallet.policyId);
    const decision = await this.checkSignMessagePolicy(policy, input.message);
    if (!decision.allowed) {
      throw new Error(decision.reason ?? 'Signing policy denied the request');
    }

    const payloadHash = hashPayload({ message: input.message });
    const signed = await this.opts.qkms.signMessage(wallet.qkmsKeyId, input.message);
    const event = await this.recordWalletEvent({
      walletId: wallet.walletId,
      eventType: 'wallet.sign_message',
      requestId: input.requestId,
      payloadHash,
      signature: signed.signature,
      metadata: {
        messageLength: input.message.length,
      },
    });

    return {
      wallet,
      signature: signed.signature,
      eventId: event.id,
      payloadHash,
    };
  }

  async listWalletEvents(userId: string, walletId: string) {
    const wallet = await this.getWalletForUser(userId, walletId);
    if (!wallet) {
      throw new WalletOwnershipError();
    }

    return this.opts.db
      .select()
      .from(walletEvents)
      .where(eq(walletEvents.walletId, wallet.walletId))
      .orderBy(desc(walletEvents.createdAt));
  }

  async recordWalletEvent(input: {
    walletId: string;
    eventType: string;
    requestId?: string;
    payloadHash?: string;
    signature?: string;
    metadata?: Record<string, unknown>;
  }) {
    const [event] = await this.opts.db
      .insert(walletEvents)
      .values({
        id: crypto.randomUUID(),
        walletId: input.walletId,
        eventType: input.eventType,
        requestId: input.requestId,
        payloadHash: input.payloadHash,
        signature: input.signature,
        metadata: input.metadata ?? {},
      })
      .returning();

    await this.opts.db.insert(proofArtifacts).values({
      id: crypto.randomUUID(),
      artifactHash: hashPayload({
        walletId: input.walletId,
        eventType: input.eventType,
        requestId: input.requestId,
        signature: input.signature,
      }),
      storageUri: `local://wallet-events/${event.id}`,
      metadata: {
        walletEventId: event.id,
        placeholder: true,
      },
    });

    return event;
  }

  private async resolvePolicy(policyId: string | null) {
    if (!policyId) {
      return null;
    }

    const policy = await this.opts.db.query.signingPolicies.findFirst({
      where: eq(signingPolicies.id, policyId),
    });
    return policy ?? null;
  }

  private async checkSignMessagePolicy(
    policy: typeof signingPolicies.$inferSelect | null,
    message: string
  ): Promise<WalletPolicyDecision> {
    if (!policy) {
      return { allowed: true };
    }

    const rules = (policy.rules ?? {}) as Record<string, unknown>;
    const maxLength = typeof rules['maxMessageLength'] === 'number' ? rules['maxMessageLength'] : null;
    if (maxLength !== null && message.length > maxLength) {
      return {
        allowed: false,
        reason: `Message length exceeds policy limit of ${maxLength}`,
      };
    }

    return { allowed: true };
  }
}

export async function ensureUserExists(db: Db, userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) {
    throw new Error(`Unknown user ${userId}`);
  }
  return user;
}

export function assertWalletOwnedByUser(ownerUserId: string, requestedUserId: string) {
  if (ownerUserId !== requestedUserId) {
    throw new WalletOwnershipError();
  }
}
