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
  mode: 'mock' | 'quilibrium-sdk';
  configured: boolean;
  server?: string;
  qnzmServer?: string;
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

export interface QuilibriumSdkConfig {
  qkmsServer: string;
  qnzmServer: string;
  appId: string;
  appSecret: string;
}

type QuilibriumNodeSdkClient = {
  wallets: () => {
    create: (input: { chain_type: string }) => Promise<{
      id?: string;
      keyId?: string;
      key_id?: string;
      address?: string;
    }>;
    ethereum?: () => {
      signMessage?: (
        walletId: string,
        input: { message: string }
      ) => Promise<{ signature?: string }>;
    };
  };
};

async function importQuilibriumNodeSdk() {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<{ QkmsClient?: new (config: unknown) => QuilibriumNodeSdkClient }>;

  try {
    return await dynamicImport('@quilibrium/qkms-sdk-node');
  } catch {
    throw new Error(
      'quilibrium-sdk custody requires @quilibrium/qkms-sdk-node to be installed and resolvable'
    );
  }
}

export class QuilibriumSdkQkmsClient implements QkmsClient {
  private client: QuilibriumNodeSdkClient | null = null;

  constructor(private readonly config: QuilibriumSdkConfig) {}

  private async getClient() {
    if (this.client) {
      return this.client;
    }

    const mod = await importQuilibriumNodeSdk();
    if (!mod.QkmsClient) {
      throw new Error('@quilibrium/qkms-sdk-node did not export QkmsClient');
    }

    this.client = new mod.QkmsClient({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      server: this.config.qkmsServer,
      qnzmServer: this.config.qnzmServer,
    });
    return this.client;
  }

  async createKey(input: CreateKeyInput): Promise<{ keyId: string; address: string }> {
    const client = await this.getClient();
    const wallet = await client.wallets().create({
      chain_type: input.curve === 'ed25519' ? 'solana' : 'ethereum',
    });
    const keyId = wallet.keyId ?? wallet.key_id ?? wallet.id;

    if (!keyId || !wallet.address) {
      throw new Error('Quilibrium SDK create wallet response is missing key id or address');
    }

    return {
      keyId,
      address: wallet.address,
    };
  }

  async getAddress(_keyId: string): Promise<{ address: string }> {
    throw new Error(
      'Quilibrium SDK address lookup is not wired yet; store address from createKey response'
    );
  }

  async signMessage(
    keyId: string,
    payload: string | Uint8Array
  ): Promise<{ signature: string }> {
    const client = await this.getClient();
    const ethereum = client.wallets().ethereum?.();
    if (!ethereum?.signMessage) {
      throw new Error('Quilibrium SDK ethereum signMessage API is unavailable');
    }

    const response = await ethereum.signMessage(keyId, {
      message:
        typeof payload === 'string' ? payload : Buffer.from(payload).toString('base64'),
    });

    if (!response.signature) {
      throw new Error('Quilibrium SDK signMessage response is missing signature');
    }

    return { signature: response.signature };
  }

  async signTransaction(_keyId: string, _tx: unknown): Promise<{ signature: string }> {
    throw new Error('Quilibrium SDK transaction signing is deferred until wallet RPC support lands');
  }

  async disableKey(_keyId: string): Promise<{ disabled: true }> {
    throw new Error('Quilibrium SDK key disable is not wired yet');
  }
}

export function createQkmsClient(opts?: {
  quilSdk?: Partial<QuilibriumSdkConfig>;
  mode?: 'mock' | 'quilibrium-sdk';
}): QkmsClient {
  const mode = opts?.mode ?? (process.env['QUILIBRIUM_QKMS_SERVER'] ? 'quilibrium-sdk' : 'mock');
  if (mode === 'quilibrium-sdk') {
    const qkmsServer = opts?.quilSdk?.qkmsServer ?? process.env['QUILIBRIUM_QKMS_SERVER'];
    const qnzmServer = opts?.quilSdk?.qnzmServer ?? process.env['QUILIBRIUM_QNZM_SERVER'];
    const appId = opts?.quilSdk?.appId ?? process.env['QUILIBRIUM_APP_ID'];
    const appSecret = opts?.quilSdk?.appSecret ?? process.env['QUILIBRIUM_APP_SECRET'];
    if (!qkmsServer || !qnzmServer || !appId || !appSecret) {
      throw new Error(
        'QUILIBRIUM_QKMS_SERVER, QUILIBRIUM_QNZM_SERVER, QUILIBRIUM_APP_ID, and QUILIBRIUM_APP_SECRET are required for quilibrium-sdk custody'
      );
    }
    return new QuilibriumSdkQkmsClient({ qkmsServer, qnzmServer, appId, appSecret });
  }
  return new MockQkmsClient();
}

export function getQkmsStatus(opts?: {
  quilSdk?: Partial<QuilibriumSdkConfig>;
  mode?: 'mock' | 'quilibrium-sdk';
}): QkmsStatus {
  const mode = opts?.mode ?? (process.env['QUILIBRIUM_QKMS_SERVER'] ? 'quilibrium-sdk' : 'mock');
  if (mode === 'quilibrium-sdk') {
    const server =
      opts?.quilSdk?.qkmsServer ?? process.env['QUILIBRIUM_QKMS_SERVER'] ?? undefined;
    const qnzmServer =
      opts?.quilSdk?.qnzmServer ?? process.env['QUILIBRIUM_QNZM_SERVER'] ?? undefined;
    const appId = opts?.quilSdk?.appId ?? process.env['QUILIBRIUM_APP_ID'] ?? undefined;
    const appSecret =
      opts?.quilSdk?.appSecret ?? process.env['QUILIBRIUM_APP_SECRET'] ?? undefined;
    return {
      mode,
      configured: Boolean(server && qnzmServer && appId && appSecret),
      server,
      qnzmServer,
    };
  }

  return {
    mode: 'mock',
    configured: true,
  };
}
