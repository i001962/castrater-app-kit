import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name'),
  email: text('email'),
  fid: integer('fid'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const passkeyCredentials = pgTable(
  'passkey_credentials',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull(),
    publicKey: text('public_key').notNull(),
    counter: integer('counter').notNull().default(0),
    transports: jsonb('transports'),
    backedUp: boolean('backed_up'),
    deviceType: text('device_type'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => ({
    credentialIdIdx: uniqueIndex('passkey_credentials_credential_id_idx').on(table.credentialId),
  })
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('sessions_token_hash_idx').on(table.tokenHash),
  })
);

export const apps = pgTable(
  'apps',
  {
    id: uuid('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('apps_slug_idx').on(table.slug),
  })
);

export const appAccounts = pgTable(
  'app_accounts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    appId: uuid('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userAppIdx: uniqueIndex('app_accounts_user_id_app_id_idx').on(table.userId, table.appId),
  })
);

export const signingPolicies = pgTable('signing_policies', {
  id: uuid('id').primaryKey(),
  appId: uuid('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  rules: jsonb('rules').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appWallets = pgTable('app_wallets', {
  id: uuid('id').primaryKey(),
  appAccountId: uuid('app_account_id')
    .notNull()
    .references(() => appAccounts.id, { onDelete: 'cascade' }),
  qkmsKeyId: text('qkms_key_id').notNull(),
  address: text('address').notNull(),
  chain: text('chain').notNull().default('evm'),
  status: text('status').notNull().default('active'),
  policyId: uuid('policy_id').references(() => signingPolicies.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const custodyKeys = pgTable('custody_keys', {
  id: uuid('id').primaryKey(),
  provider: text('provider').notNull(),
  curve: text('curve').notNull(),
  encryptedPrivateKey: text('encrypted_private_key').notNull(),
  publicKey: text('public_key').notNull(),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const walletEvents = pgTable('wallet_events', {
  id: uuid('id').primaryKey(),
  walletId: uuid('wallet_id')
    .notNull()
    .references(() => appWallets.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  requestId: text('request_id'),
  payloadHash: text('payload_hash'),
  signature: text('signature'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const proofArtifacts = pgTable('proof_artifacts', {
  id: uuid('id').primaryKey(),
  artifactHash: text('artifact_hash').notNull(),
  storageUri: text('storage_uri').notNull(),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
