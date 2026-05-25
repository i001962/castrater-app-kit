import fp from 'fastify-plugin';
import { getDb, type Db } from '@castrater/db';
import { sql } from 'drizzle-orm';

declare module 'fastify' {
  interface FastifyInstance {
    db?: Db;
  }
}

export const dbPlugin = fp(async (app) => {
  if (!app.env.DATABASE_URL) {
    app.log.warn('DATABASE_URL not set — Postgres/Drizzle features disabled');
    return;
  }
  const db = getDb(app.env.DATABASE_URL);
  await db.execute(sql`create extension if not exists pgcrypto;`);
  await db.execute(sql`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      display_name text,
      email text,
      fid integer,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await db.execute(sql`
    create table if not exists passkey_credentials (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      credential_id text not null unique,
      public_key text not null,
      counter integer not null default 0,
      transports jsonb,
      backed_up boolean,
      device_type text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_used_at timestamptz
    );
  `);
  await db.execute(sql`
    create table if not exists sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      token_hash text not null unique,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );
  `);
  await db.execute(sql`
    create table if not exists apps (
      id uuid primary key default gen_random_uuid(),
      slug text not null unique,
      name text not null,
      created_at timestamptz not null default now()
    );
  `);
  await db.execute(sql`
    create table if not exists app_accounts (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      app_id uuid not null references apps(id) on delete cascade,
      role text not null default 'user',
      created_at timestamptz not null default now(),
      unique (user_id, app_id)
    );
  `);
  await db.execute(sql`
    create table if not exists app_wallets (
      id uuid primary key default gen_random_uuid(),
      app_account_id uuid not null references app_accounts(id) on delete cascade,
      qkms_key_id text not null,
      address text not null,
      chain text not null default 'evm',
      status text not null default 'active',
      policy_id uuid,
      created_at timestamptz not null default now()
    );
  `);
  await db.execute(sql`
    create table if not exists signing_policies (
      id uuid primary key default gen_random_uuid(),
      app_id uuid not null references apps(id) on delete cascade,
      name text not null,
      rules jsonb not null,
      created_at timestamptz not null default now()
    );
  `);
  await db.execute(sql`
    create table if not exists wallet_events (
      id uuid primary key default gen_random_uuid(),
      wallet_id uuid not null references app_wallets(id) on delete cascade,
      event_type text not null,
      request_id text,
      payload_hash text,
      signature text,
      metadata jsonb not null,
      created_at timestamptz not null default now()
    );
  `);
  await db.execute(sql`
    create table if not exists proof_artifacts (
      id uuid primary key default gen_random_uuid(),
      artifact_hash text not null,
      storage_uri text not null,
      metadata jsonb not null,
      created_at timestamptz not null default now()
    );
  `);
  app.decorate('db', db);
});
