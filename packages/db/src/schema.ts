import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fid: integer('fid'),
  username: text('username'),
  displayName: text('display_name'),
  pfpUrl: text('pfp_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const apps = pgTable('apps', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  domain: text('domain'),
  ownerId: uuid('owner_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const appAccounts = pgTable('app_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  appId: uuid('app_id').references(() => apps.id),
  externalId: text('external_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const appWallets = pgTable('app_wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  appId: uuid('app_id').references(() => apps.id),
  keyId: text('key_id').notNull(),
  address: text('address').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const walletEvents = pgTable('wallet_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').references(() => appWallets.id),
  type: text('type').notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const signingPolicies = pgTable('signing_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').references(() => appWallets.id),
  maxValueWei: text('max_value_wei'),
  allowedActions: jsonb('allowed_actions'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const proofArtifacts = pgTable('proof_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  proofId: text('proof_id').notNull().unique(),
  artifactHash: text('artifact_hash').notNull(),
  storageUri: text('storage_uri').notNull(),
  signer: text('signer'),
  backend: text('backend').notNull().default('local-dev'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const jobsAudit = pgTable('jobs_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: text('job_id').notNull(),
  queueName: text('queue_name').notNull(),
  jobName: text('job_name').notNull(),
  status: text('status').notNull(),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});
