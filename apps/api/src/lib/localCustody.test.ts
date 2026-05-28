import test from 'node:test';
import assert from 'node:assert/strict';
import type { Db } from '@castrater/db';
import { LocalCustodyClient } from './localCustody.js';

function createStubDb() {
  const records = new Map<string, Record<string, unknown>>();

  const db = {
    query: {
      custodyKeys: {
        findFirst: async () => Array.from(records.values())[0] ?? null,
      },
    },
    insert: () => ({
      values: async (value: Record<string, unknown>) => {
        records.set(value['id'] as string, value);
      },
    }),
    delete: () => ({
      where: async (where: { right: { value: string } }) => {
        records.delete(where.right.value);
      },
    }),
  } as unknown as Db;

  return { db, records };
}

test('LocalCustodyClient creates and signs with a durable key', async () => {
  const { db, records } = createStubDb();
  const client = new LocalCustodyClient(db, 'dev-secret');

  const created = await client.createKey({ label: 'wallet', curve: 'secp256k1' });
  assert.match(created.keyId, /^[0-9a-f-]{36}$/);
  assert.match(created.address, /^0x[a-fA-F0-9]{40}$/);
  assert.equal(records.size, 1);

  const signed = await client.signMessage(created.keyId, 'hello');
  assert.match(signed.signature, /^0x[a-fA-F0-9]+$/);

  const resolved = await client.getAddress(created.keyId);
  assert.equal(resolved.address, created.address);
});
