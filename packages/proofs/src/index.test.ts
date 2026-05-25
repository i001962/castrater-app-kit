import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPayload } from './index.js';

test('hashPayload is deterministic', () => {
  assert.equal(hashPayload({ hello: 'world' }), hashPayload({ hello: 'world' }));
});
