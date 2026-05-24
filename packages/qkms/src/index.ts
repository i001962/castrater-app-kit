/// <reference types="node" />
/**
 * qKMS adapter for Quilibrium Key Management Service.
 *
 * This is an adapter ONLY — it does not replace qKMS.
 * Production: configure QKMS_URL and QKMS_API_KEY to point to real qKMS.
 *
 * Security rules:
 * - Browser NEVER talks directly to qKMS
 * - Only API/worker processes call qKMS
 * - No raw private keys are ever stored or returned
 */

export interface CreateKeyInput {
  label?: string;
  curve?: 'secp256k1' | 'ed25519';
}

export interface CreateKeyResult {
  keyId: string;
  address: string;
  curve: string;
}

export interface SignResult {
  signature: string;
  keyId: string;
}

export interface QkmsClient {
  createKey(input: CreateKeyInput): Promise<CreateKeyResult>;
  getAddress(keyId: string): Promise<string>;
  signMessage(keyId: string, payload: string): Promise<SignResult>;
  signTransaction(keyId: string, tx: unknown): Promise<SignResult>;
  rotateKey(keyId: string): Promise<{ newKeyId: string }>;
  disableKey(keyId: string): Promise<void>;
}

/**
 * MOCK qKMS client — FOR LOCAL DEVELOPMENT ONLY.
 *
 * ⚠️  WARNING: This mock is UNSAFE for production.
 * It does NOT provide real cryptographic security.
 * Replace with real qKMS adapter before deploying to production.
 */
export class MockQkmsClient implements QkmsClient {
  private keys = new Map<string, { address: string; curve: string }>();

  async createKey(input: CreateKeyInput): Promise<CreateKeyResult> {
    const keyId = `mock-key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const address = `0xMOCK${keyId.slice(-8).toUpperCase()}`;
    const curve = input.curve ?? 'secp256k1';
    this.keys.set(keyId, { address, curve });
    console.warn('[qkms:mock] createKey — UNSAFE, dev only');
    return { keyId, address, curve };
  }

  async getAddress(keyId: string): Promise<string> {
    const key = this.keys.get(keyId);
    if (!key) throw new Error(`MockQkmsClient: key not found: ${keyId}`);
    return key.address;
  }

  async signMessage(keyId: string, payload: string): Promise<SignResult> {
    if (!this.keys.has(keyId)) throw new Error(`MockQkmsClient: key not found: ${keyId}`);
    const signature = `0xMOCKSIG_${Buffer.from(payload).toString('hex').slice(0, 16)}`;
    console.warn('[qkms:mock] signMessage — UNSAFE, dev only');
    return { signature, keyId };
  }

  async signTransaction(keyId: string, _tx: unknown): Promise<SignResult> {
    if (!this.keys.has(keyId)) throw new Error(`MockQkmsClient: key not found: ${keyId}`);
    const signature = `0xMOCKTXSIG_${Date.now()}`;
    console.warn('[qkms:mock] signTransaction — UNSAFE, dev only');
    return { signature, keyId };
  }

  async rotateKey(keyId: string): Promise<{ newKeyId: string }> {
    const existing = this.keys.get(keyId);
    if (!existing) throw new Error(`MockQkmsClient: key not found: ${keyId}`);
    const newKeyId = `mock-key-rotated-${Date.now()}`;
    this.keys.set(newKeyId, existing);
    this.keys.delete(keyId);
    console.warn('[qkms:mock] rotateKey — UNSAFE, dev only');
    return { newKeyId };
  }

  async disableKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
    console.warn('[qkms:mock] disableKey — UNSAFE, dev only');
  }
}

/**
 * Remote qKMS HTTP client stub.
 * TODO: Implement against real qKMS REST API when available.
 */
export class RemoteQkmsClient implements QkmsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  private async request<T>(path: string, opts?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
        ...opts?.headers,
      },
    });
    if (!res.ok) throw new Error(`qKMS request failed: ${res.status} ${path}`);
    return res.json() as Promise<T>;
  }

  async createKey(input: CreateKeyInput): Promise<CreateKeyResult> {
    return this.request('/v1/keys', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getAddress(keyId: string): Promise<string> {
    const result = await this.request<{ address: string }>(`/v1/keys/${keyId}/address`);
    return result.address;
  }

  async signMessage(keyId: string, payload: string): Promise<SignResult> {
    return this.request(`/v1/keys/${keyId}/sign`, {
      method: 'POST',
      body: JSON.stringify({ payload }),
    });
  }

  async signTransaction(keyId: string, tx: unknown): Promise<SignResult> {
    return this.request(`/v1/keys/${keyId}/sign-tx`, {
      method: 'POST',
      body: JSON.stringify({ tx }),
    });
  }

  async rotateKey(keyId: string): Promise<{ newKeyId: string }> {
    return this.request(`/v1/keys/${keyId}/rotate`, { method: 'POST' });
  }

  async disableKey(keyId: string): Promise<void> {
    await this.request(`/v1/keys/${keyId}`, { method: 'DELETE' });
  }
}

export function createQkmsClient(opts?: {
  mode?: 'mock' | 'remote';
  baseUrl?: string;
  apiKey?: string;
}): QkmsClient {
  const mode = opts?.mode ?? (process.env['QKMS_URL'] ? 'remote' : 'mock');
  if (mode === 'remote') {
    const baseUrl = opts?.baseUrl ?? process.env['QKMS_URL'];
    const apiKey = opts?.apiKey ?? process.env['QKMS_API_KEY'];
    if (!baseUrl || !apiKey) {
      throw new Error('RemoteQkmsClient requires QKMS_URL and QKMS_API_KEY');
    }
    return new RemoteQkmsClient(baseUrl, apiKey);
  }
  return new MockQkmsClient();
}
