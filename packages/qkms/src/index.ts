/// <reference types="node" />
import { createHash } from 'node:crypto';

export interface CreateKeyInput {
  label?: string;
  curve?: 'secp256k1' | 'ed25519';
}

export interface QkmsClient {
  createKey(input: CreateKeyInput): Promise<{ keyId: string; address: string }>;
  getAddress(keyId: string): Promise<{ address: string }>;
  signMessage(keyId: string, payload: string | Uint8Array): Promise<{ signature: string }>;
  signTransaction(keyId: string, tx: unknown): Promise<{ signature: string }>;
  disableKey(keyId: string): Promise<{ disabled: true }>;
}

/**
 * MOCK qKMS client — FOR LOCAL DEVELOPMENT ONLY.
 *
 * ⚠️ This mock is unsafe for production and does not provide secure key custody.
 */
export class MockQkmsClient implements QkmsClient {
  private keys = new Map<string, { address: string }>();
  private nextSeed = 1;

  async createKey(input: CreateKeyInput): Promise<{ keyId: string; address: string }> {
    const seed = `${input.label ?? 'key'}:${this.nextSeed++}`;
    const digest = createHash('sha256').update(seed).digest('hex');
    const keyId = `mock-key-${digest.slice(0, 20)}`;
    const address = `0x${digest.slice(0, 40)}`;
    this.keys.set(keyId, { address });
    return { keyId, address };
  }

  async getAddress(keyId: string): Promise<{ address: string }> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`MockQkmsClient: key not found (${keyId})`);
    }
    return { address: key.address };
  }

  async signMessage(
    keyId: string,
    payload: string | Uint8Array
  ): Promise<{ signature: string }> {
    if (!this.keys.has(keyId)) {
      throw new Error(`MockQkmsClient: key not found (${keyId})`);
    }
    const bytes = typeof payload === 'string' ? Buffer.from(payload) : Buffer.from(payload);
    const digest = createHash('sha256').update(keyId).update(bytes).digest('hex');
    return { signature: `0xmocksig${digest}` };
  }

  async signTransaction(keyId: string, tx: unknown): Promise<{ signature: string }> {
    if (!this.keys.has(keyId)) {
      throw new Error(`MockQkmsClient: key not found (${keyId})`);
    }
    const digest = createHash('sha256')
      .update(keyId)
      .update(JSON.stringify(tx))
      .digest('hex');
    return { signature: `0xmocktx${digest}` };
  }

  async disableKey(keyId: string): Promise<{ disabled: true }> {
    this.keys.delete(keyId);
    return { disabled: true };
  }
}

export class RemoteQkmsClient implements QkmsClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
        ...init?.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`qKMS request failed (${response.status})`);
    }
    return (await response.json()) as T;
  }

  createKey(input: CreateKeyInput): Promise<{ keyId: string; address: string }> {
    return this.request('/v1/keys', { method: 'POST', body: JSON.stringify(input) });
  }

  getAddress(keyId: string): Promise<{ address: string }> {
    return this.request(`/v1/keys/${keyId}/address`);
  }

  signMessage(keyId: string, payload: string | Uint8Array): Promise<{ signature: string }> {
    const payloadValue =
      typeof payload === 'string' ? payload : Buffer.from(payload).toString('base64url');
    return this.request(`/v1/keys/${keyId}/sign-message`, {
      method: 'POST',
      body: JSON.stringify({ payload: payloadValue }),
    });
  }

  signTransaction(keyId: string, tx: unknown): Promise<{ signature: string }> {
    return this.request(`/v1/keys/${keyId}/sign-transaction`, {
      method: 'POST',
      body: JSON.stringify({ tx }),
    });
  }

  disableKey(keyId: string): Promise<{ disabled: true }> {
    return this.request(`/v1/keys/${keyId}`, { method: 'DELETE' });
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
