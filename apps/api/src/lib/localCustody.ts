import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { custodyKeys, type Db } from '@castrater/db';
import type { CreateKeyInput, QkmsClient } from '@castrater/qkms';
import { toHex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

function deriveEncryptionKey(secret: string) {
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptPrivateKey(privateKey: string, secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveEncryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: authTag.toString('base64'),
  });
}

function decryptPrivateKey(payload: string, secret: string) {
  const parsed = JSON.parse(payload) as {
    iv: string;
    ciphertext: string;
    authTag: string;
  };
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    deriveEncryptionKey(secret),
    Buffer.from(parsed.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(parsed.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(parsed.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8') as `0x${string}`;
}

export class LocalCustodyClient implements QkmsClient {
  constructor(
    private readonly db: Db,
    private readonly secret: string
  ) {}

  async createKey(input: CreateKeyInput): Promise<{ keyId: string; address: string }> {
    if (input.curve && input.curve !== 'secp256k1') {
      throw new Error(`Local custody only supports secp256k1 today, received ${input.curve}`);
    }

    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const keyId = crypto.randomUUID();

    await this.db.insert(custodyKeys).values({
      id: keyId,
      provider: 'local',
      curve: 'secp256k1',
      encryptedPrivateKey: encryptPrivateKey(privateKey, this.secret),
      publicKey: account.publicKey,
      metadata: {
        address: account.address,
        label: input.label ?? null,
      },
    });

    return {
      keyId,
      address: account.address,
    };
  }

  async getAddress(keyId: string): Promise<{ address: string }> {
    const key = await this.db.query.custodyKeys.findFirst({
      where: eq(custodyKeys.id, keyId),
    });
    if (!key) {
      throw new Error(`Local custody key not found: ${keyId}`);
    }
    const metadata = key.metadata as Record<string, unknown>;
    const address = metadata['address'];
    if (typeof address !== 'string') {
      throw new Error(`Local custody key is missing address metadata: ${keyId}`);
    }
    return { address };
  }

  async signMessage(
    keyId: string,
    payload: string | Uint8Array
  ): Promise<{ signature: string }> {
    const key = await this.db.query.custodyKeys.findFirst({
      where: eq(custodyKeys.id, keyId),
    });
    if (!key) {
      throw new Error(`Local custody key not found: ${keyId}`);
    }

    const privateKey = decryptPrivateKey(key.encryptedPrivateKey, this.secret);
    const account = privateKeyToAccount(privateKey);
    const signature = await account.signMessage({
      message: typeof payload === 'string' ? payload : { raw: toHex(payload) },
    });
    return { signature };
  }

  async signTransaction(keyId: string, tx: unknown): Promise<{ signature: string }> {
    return this.signMessage(keyId, JSON.stringify(tx));
  }

  async disableKey(keyId: string): Promise<{ disabled: true }> {
    await this.db.delete(custodyKeys).where(eq(custodyKeys.id, keyId));
    return { disabled: true };
  }
}
