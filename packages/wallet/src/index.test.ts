import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWalletOwnedByUser, WalletOwnershipError } from './index.js';

test('wallet ownership guard rejects wrong user', () => {
  assert.throws(
    () => assertWalletOwnedByUser('user-a', 'user-b'),
    WalletOwnershipError
  );
});
