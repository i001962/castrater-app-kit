import test from 'node:test';
import assert from 'node:assert/strict';
import type { Db } from '@castrater/db';
import { buildApp } from './app.js';

function createStubDb(): Db {
  const selectChain = {
    innerJoin: () => ({
      where: () => ({
        limit: async () => [],
      }),
    }),
  };

  return {
    execute: async () => [{ ok: 1 }],
    query: {
      users: {
        findFirst: async () => null,
      },
      passkeyCredentials: {
        findFirst: async () => null,
        findMany: async () => [],
      },
      apps: {
        findFirst: async () => null,
      },
      appAccounts: {
        findFirst: async () => null,
      },
      custodyKeys: {
        findFirst: async () => null,
      },
      signingPolicies: {
        findFirst: async () => null,
      },
    },
    insert: () => ({
      values: () => ({
        returning: async () => [
          {
            id: 'demo-user',
            displayName: 'Demo User',
            email: 'demo@example.com',
          },
        ],
        onConflictDoUpdate: () => ({
          returning: async () => [
            {
              id: 'demo-user',
              displayName: 'Demo User',
              email: 'demo@example.com',
            },
          ],
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => undefined,
      }),
    }),
    delete: () => ({
      where: async () => undefined,
    }),
    select: () => ({
      from: () => selectChain,
    }),
  } as unknown as Db;
}

test('/health returns ok', async () => {
  const app = await buildApp({
    db: createStubDb(),
    redis: null,
    env: {
      NODE_ENV: 'test',
      AUTH_INSECURE_COOKIE: true,
    },
  });

  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().ok, true);
  await app.close();
});

test('unauthenticated /v1/auth/me returns 401', async () => {
  const app = await buildApp({
    db: createStubDb(),
    redis: null,
    env: {
      NODE_ENV: 'test',
      AUTH_INSECURE_COOKIE: true,
    },
  });

  const response = await app.inject({ method: 'GET', url: '/v1/auth/me' });
  assert.equal(response.statusCode, 401);
  await app.close();
});

test('unauthenticated /v1/wallets returns 401', async () => {
  const app = await buildApp({
    db: createStubDb(),
    redis: null,
    env: {
      NODE_ENV: 'test',
      AUTH_INSECURE_COOKIE: true,
    },
  });

  const response = await app.inject({ method: 'GET', url: '/v1/wallets' });
  assert.equal(response.statusCode, 401);
  await app.close();
});

test('/v1/status reports qkms status', async () => {
  const app = await buildApp({
    db: createStubDb(),
    redis: null,
    env: {
      NODE_ENV: 'test',
      AUTH_INSECURE_COOKIE: true,
      CUSTODY_PROVIDER: 'mock',
    },
  });

  const response = await app.inject({ method: 'GET', url: '/v1/status' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.custody.mode, 'mock');
  await app.close();
});

test('demo auth mode resolves a durable current user without session cookies', async () => {
  const app = await buildApp({
    db: createStubDb(),
    redis: null,
    env: {
      NODE_ENV: 'test',
      AUTH_PROVIDER: 'demo',
      SESSION_PROVIDER: 'none',
      AUTH_INSECURE_COOKIE: true,
    },
  });

  const response = await app.inject({ method: 'GET', url: '/v1/auth/me' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().ok, true);
  await app.close();
});
