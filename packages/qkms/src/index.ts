import crypto from 'node:crypto';

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

export interface QkmsStatus {
  mode: 'mock' | 'remote';
  configured: boolean;
  baseUrl?: string;
}

function digestHex(value: string | Uint8Array): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Development-only mock client.
 * This exists to preserve the signing boundary shape during local work.
 * It does not provide custody or real cryptographic guarantees.
 */
export class MockQkmsClient implements QkmsClient {
  private readonly keys = new Map<string, { address: string }>();

  async createKey(input: CreateKeyInput): Promise<{ keyId: string; address: string }> {
    const label = input.label ?? 'wallet';
    const seed = `${label}:${input.curve ?? 'secp256k1'}:${Date.now()}:${Math.random()}`;
    const keyId = `mock_qkms_${digestHex(seed).slice(0, 24)}`;
    const address = `0x${digestHex(`${keyId}:address`).slice(0, 40)}`;

    this.keys.set(keyId, { address });
    console.warn('[qkms:mock] createKey() is unsafe and for development only');

    return { keyId, address };
  }

  async getAddress(keyId: string): Promise<{ address: string }> {
    const record = this.keys.get(keyId);
    if (!record) {
      throw new Error(`MockQkmsClient: unknown key ${keyId}`);
    }
    return { address: record.address };
  }

  async signMessage(
    keyId: string,
    payload: string | Uint8Array
  ): Promise<{ signature: string }> {
    if (!this.keys.has(keyId)) {
      throw new Error(`MockQkmsClient: unknown key ${keyId}`);
    }
    const signature = `0xmocksig${digestHex(
      typeof payload === 'string' ? payload : payload
    ).slice(0, 56)}`;
    console.warn('[qkms:mock] signMessage() is unsafe and for development only');
    return { signature };
  }

  async signTransaction(keyId: string, tx: unknown): Promise<{ signature: string }> {
    return this.signMessage(keyId, JSON.stringify(tx));
  }

  async disableKey(keyId: string): Promise<{ disabled: true }> {
    this.keys.delete(keyId);
    console.warn('[qkms:mock] disableKey() is unsafe and for development only');
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
      throw new Error(`qKMS request failed: ${response.status} ${path}`);
    }

    return (await response.json()) as T;
  }

  createKey(input: CreateKeyInput): Promise<{ keyId: string; address: string }> {
    return this.request('/v1/keys', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  getAddress(keyId: string): Promise<{ address: string }> {
    return this.request(`/v1/keys/${keyId}/address`);
  }

  signMessage(keyId: string, payload: string | Uint8Array): Promise<{ signature: string }> {
    return this.request(`/v1/keys/${keyId}/sign`, {
      method: 'POST',
      body: JSON.stringify({
        payload:
          typeof payload === 'string'
            ? payload
            : Buffer.from(payload).toString('base64'),
      }),
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
  baseUrl?: string;
  apiKey?: string;
  mode?: 'mock' | 'remote';
}): QkmsClient {
  const mode = opts?.mode ?? (process.env['QKMS_URL'] ? 'remote' : 'mock');
  if (mode === 'remote') {
    const baseUrl = opts?.baseUrl ?? process.env['QKMS_URL'];
    const apiKey = opts?.apiKey ?? process.env['QKMS_API_KEY'];
    if (!baseUrl || !apiKey) {
      throw new Error('QKMS_URL and QKMS_API_KEY are required for remote qKMS mode');
    }
    return new RemoteQkmsClient(baseUrl, apiKey);
  }
  return new MockQkmsClient();
}

export function getQkmsStatus(opts?: {
  baseUrl?: string;
  apiKey?: string;
  mode?: 'mock' | 'remote';
}): QkmsStatus {
  const mode = opts?.mode ?? (process.env['QKMS_URL'] ? 'remote' : 'mock');
  if (mode === 'remote') {
    const baseUrl = opts?.baseUrl ?? process.env['QKMS_URL'] ?? undefined;
    const apiKey = opts?.apiKey ?? process.env['QKMS_API_KEY'] ?? undefined;
    return {
      mode,
      configured: Boolean(baseUrl && apiKey),
      baseUrl,
    };
  }

  return {
    mode: 'mock',
    configured: true,
  };
}
