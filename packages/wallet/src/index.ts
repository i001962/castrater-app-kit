/// <reference types="node" />
import { createHash, randomUUID } from 'node:crypto';
import {
  appAccounts,
  apps,
  appWallets,
  signingPolicies,
  walletEvents,
  type Db,
} from '@castrater/db';
import type { QkmsClient } from '@castrater/qkms';
import { and, desc, eq } from 'drizzle-orm';

export interface CreateAppWalletInput {
  userId: string;
  appSlug: string;
}

export interface SignMessageForUserInput {
  userId: string;
  walletId: string;
  message: string;
  requestId?: string;
}

export interface RecordWalletEventInput {
  walletId: string;
  eventType: string;
  requestId?: string | null;
  payloadHash?: string | null;
  signature?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WalletRecord {
  id: string;
  appAccountId: string;
  appId: string;
  appSlug: string;
  qkmsKeyId: string;
  address: string;
  chain: string;
  status: string;
  policyId: string | null;
  createdAt: Date;
}

export class DbWalletService {
  constructor(
    private readonly db: Db,
    private readonly qkms: QkmsClient
  ) {}

  async createAppWallet({ userId, appSlug }: CreateAppWalletInput): Promise<WalletRecord> {
    const appRecord = await this.getOrCreateApp(appSlug);
    const accountRecord = await this.getOrCreateAppAccount(userId, appRecord.id);
    const { keyId, address } = await this.qkms.createKey({
      label: `wallet:${userId}:${appSlug}:${Date.now()}`,
    });

    const insertedWallet = await this.db
      .insert(appWallets)
      .values({
        appAccountId: accountRecord.id,
        qkmsKeyId: keyId,
        address,
      })
      .returning();
    const wallet = insertedWallet[0];
    if (!wallet) {
      throw new Error('Failed to create wallet');
    }

    await this.recordWalletEvent({
      walletId: wallet.id,
      eventType: 'wallet.created',
      metadata: { appSlug },
    });

    return {
      id: wallet.id,
      appAccountId: wallet.appAccountId,
      appId: appRecord.id,
      appSlug: appRecord.slug,
      qkmsKeyId: wallet.qkmsKeyId,
      address: wallet.address,
      chain: wallet.chain,
      status: wallet.status,
      policyId: wallet.policyId,
      createdAt: wallet.createdAt,
    };
  }

  async listUserWallets(userId: string): Promise<WalletRecord[]> {
    const rows = await this.db
      .select({
        id: appWallets.id,
        appAccountId: appWallets.appAccountId,
        appId: apps.id,
        appSlug: apps.slug,
        qkmsKeyId: appWallets.qkmsKeyId,
        address: appWallets.address,
        chain: appWallets.chain,
        status: appWallets.status,
        policyId: appWallets.policyId,
        createdAt: appWallets.createdAt,
      })
      .from(appWallets)
      .innerJoin(appAccounts, eq(appAccounts.id, appWallets.appAccountId))
      .innerJoin(apps, eq(apps.id, appAccounts.appId))
      .where(eq(appAccounts.userId, userId))
      .orderBy(desc(appWallets.createdAt));

    return rows;
  }

  async getWalletForUser(userId: string, walletId: string): Promise<WalletRecord | null> {
    const rows = await this.db
      .select({
        id: appWallets.id,
        appAccountId: appWallets.appAccountId,
        appId: apps.id,
        appSlug: apps.slug,
        qkmsKeyId: appWallets.qkmsKeyId,
        address: appWallets.address,
        chain: appWallets.chain,
        status: appWallets.status,
        policyId: appWallets.policyId,
        createdAt: appWallets.createdAt,
      })
      .from(appWallets)
      .innerJoin(appAccounts, eq(appAccounts.id, appWallets.appAccountId))
      .innerJoin(apps, eq(apps.id, appAccounts.appId))
      .where(and(eq(appWallets.id, walletId), eq(appAccounts.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async signMessageForUser(input: SignMessageForUserInput): Promise<{ signature: string; eventId: string }> {
    const wallet = await this.getWalletForUser(input.userId, input.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    if (wallet.status !== 'active') {
      throw new Error('Wallet is not active');
    }

    const policyDecision = await this.canSignMessage({
      appId: wallet.appId,
      walletId: wallet.id,
      message: input.message,
    });
    if (!policyDecision.allowed) {
      throw new Error(`Signing policy denied request: ${policyDecision.reason}`);
    }

    const payloadHash = createHash('sha256').update(input.message).digest('hex');
    const signed = await this.qkms.signMessage(wallet.qkmsKeyId, payloadHash);
    const event = await this.recordWalletEvent({
      walletId: wallet.id,
      eventType: 'wallet.sign_message',
      requestId: input.requestId ?? randomUUID(),
      payloadHash,
      signature: signed.signature,
      metadata: {
        policyName: policyDecision.policyName ?? 'default-allow-sign-message',
      },
    });

    return { signature: signed.signature, eventId: event.id };
  }

  async listWalletEventsForUser(userId: string, walletId: string) {
    const wallet = await this.getWalletForUser(userId, walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const events = await this.db
      .select()
      .from(walletEvents)
      .where(eq(walletEvents.walletId, walletId))
      .orderBy(desc(walletEvents.createdAt));
    return events;
  }

  async recordWalletEvent(input: RecordWalletEventInput) {
    const inserted = await this.db
      .insert(walletEvents)
      .values({
        walletId: input.walletId,
        eventType: input.eventType,
        requestId: input.requestId ?? null,
        payloadHash: input.payloadHash ?? null,
        signature: input.signature ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();
    const event = inserted[0];
    if (!event) {
      throw new Error('Failed to record wallet event');
    }
    return event;
  }

  private async canSignMessage(input: { appId: string; walletId: string; message: string }) {
    const rows = await this.db
      .select()
      .from(signingPolicies)
      .where(eq(signingPolicies.appId, input.appId))
      .orderBy(desc(signingPolicies.createdAt))
      .limit(1);
    const policy = rows[0];
    if (!policy) {
      return { allowed: true, reason: 'default allow', policyName: null as string | null };
    }
    const blocked = Boolean((policy.rules['denySignMessage'] as boolean | undefined) === true);
    if (blocked) {
      return { allowed: false, reason: 'denySignMessage rule', policyName: policy.name };
    }
    return { allowed: true, reason: 'policy allows sign-message', policyName: policy.name };
  }

  private async getOrCreateApp(slug: string) {
    const existing = await this.db.select().from(apps).where(eq(apps.slug, slug)).limit(1);
    if (existing[0]) {
      return existing[0];
    }

    const inserted = await this.db
      .insert(apps)
      .values({
        slug,
        name: slug
          .split('-')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
      })
      .onConflictDoNothing()
      .returning();

    if (inserted[0]) {
      return inserted[0];
    }

    const reloaded = await this.db.select().from(apps).where(eq(apps.slug, slug)).limit(1);
    if (!reloaded[0]) {
      throw new Error('Failed to load app');
    }
    return reloaded[0];
  }

  private async getOrCreateAppAccount(userId: string, appId: string) {
    const existing = await this.db
      .select()
      .from(appAccounts)
      .where(and(eq(appAccounts.userId, userId), eq(appAccounts.appId, appId)))
      .limit(1);
    if (existing[0]) {
      return existing[0];
    }

    const inserted = await this.db
      .insert(appAccounts)
      .values({ userId, appId })
      .onConflictDoNothing()
      .returning();

    if (inserted[0]) {
      return inserted[0];
    }

    const reloaded = await this.db
      .select()
      .from(appAccounts)
      .where(and(eq(appAccounts.userId, userId), eq(appAccounts.appId, appId)))
      .limit(1);
    if (!reloaded[0]) {
      throw new Error('Failed to load app account');
    }
    return reloaded[0];
  }
}
