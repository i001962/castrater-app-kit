/**
 * App-scoped embedded wallet logic.
 *
 * Identity model:
 *   sovereign user identity -> app account -> app wallet
 *
 * Rules:
 * - No raw private keys stored or returned
 * - qKMS handles all signing
 * - Wallet actions are audited
 * - App wallets are revocable and limited in scope
 */

import type { QkmsClient } from '@castrater/qkms';

export interface AppWallet {
  walletId: string;
  userId: string;
  appId: string;
  address: string;
  keyId: string;
  status: 'active' | 'revoked' | 'suspended';
  createdAt: Date;
}

export interface WalletEvent {
  eventId: string;
  walletId: string;
  type: string;
  payload: unknown;
  timestamp: Date;
}

export interface SigningPolicy {
  walletId: string;
  maxValueWei?: string;
  allowedActions: string[];
  expiresAt?: Date;
}

export interface WalletService {
  createAppWallet(userId: string, appId: string): Promise<AppWallet>;
  getWallet(walletId: string): Promise<AppWallet | null>;
  signWithPolicy(walletId: string, payload: string, policy?: SigningPolicy): Promise<{ signature: string }>;
  recordWalletEvent(event: Omit<WalletEvent, 'eventId' | 'timestamp'>): Promise<WalletEvent>;
}

/**
 * In-memory wallet service for local development.
 * Production: replace with Postgres-backed implementation using Drizzle ORM.
 */
export class MockWalletService implements WalletService {
  private wallets = new Map<string, AppWallet>();
  private events: WalletEvent[] = [];

  constructor(private readonly qkms: QkmsClient) {}

  async createAppWallet(userId: string, appId: string): Promise<AppWallet> {
    const key = await this.qkms.createKey({ label: `wallet:${userId}:${appId}` });
    const wallet: AppWallet = {
      walletId: `wallet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      appId,
      address: key.address,
      keyId: key.keyId,
      status: 'active',
      createdAt: new Date(),
    };
    this.wallets.set(wallet.walletId, wallet);
    await this.recordWalletEvent({
      walletId: wallet.walletId,
      type: 'wallet.created',
      payload: { userId, appId },
    });
    return wallet;
  }

  async getWallet(walletId: string): Promise<AppWallet | null> {
    return this.wallets.get(walletId) ?? null;
  }

  async signWithPolicy(
    walletId: string,
    payload: string,
    policy?: SigningPolicy
  ): Promise<{ signature: string }> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error(`Wallet not found: ${walletId}`);
    if (wallet.status !== 'active') throw new Error(`Wallet is not active: ${walletId}`);
    if (policy?.expiresAt && policy.expiresAt < new Date()) {
      throw new Error('Signing policy has expired');
    }
    const result = await this.qkms.signMessage(wallet.keyId, payload);
    await this.recordWalletEvent({
      walletId,
      type: 'wallet.signed',
      payload: { payloadLength: payload.length },
    });
    return { signature: result.signature };
  }

  async recordWalletEvent(
    event: Omit<WalletEvent, 'eventId' | 'timestamp'>
  ): Promise<WalletEvent> {
    const full: WalletEvent = {
      ...event,
      eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    };
    this.events.push(full);
    return full;
  }
}
