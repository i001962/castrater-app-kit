import test from 'node:test';
import assert from 'node:assert/strict';
import { MockQkmsClient } from './index.js';

test('MockQkmsClient creates deterministic-looking key material', async () => {
  const client = new MockQkmsClient();
  const result = await client.createKey({ label: 'demo-wallet' });

  assert.match(result.keyId, /^mock_qkms_/);
  assert.match(result.address, /^0x[a-f0-9]{40}$/);
});
