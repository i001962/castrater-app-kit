CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY,
  "display_name" text,
  "email" text,
  "fid" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "apps" (
  "id" uuid PRIMARY KEY,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "apps_slug_idx" ON "apps" ("slug");

CREATE TABLE IF NOT EXISTS "passkey_credentials" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "credential_id" text NOT NULL,
  "public_key" text NOT NULL,
  "counter" integer NOT NULL DEFAULT 0,
  "transports" jsonb,
  "backed_up" boolean,
  "device_type" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_used_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "passkey_credentials_credential_id_idx"
  ON "passkey_credentials" ("credential_id");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_hash_idx" ON "sessions" ("token_hash");

CREATE TABLE IF NOT EXISTS "app_accounts" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "app_id" uuid NOT NULL REFERENCES "apps"("id") ON DELETE cascade,
  "role" text NOT NULL DEFAULT 'user',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_accounts_user_id_app_id_idx"
  ON "app_accounts" ("user_id", "app_id");

CREATE TABLE IF NOT EXISTS "signing_policies" (
  "id" uuid PRIMARY KEY,
  "app_id" uuid NOT NULL REFERENCES "apps"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "rules" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "app_wallets" (
  "id" uuid PRIMARY KEY,
  "app_account_id" uuid NOT NULL REFERENCES "app_accounts"("id") ON DELETE cascade,
  "qkms_key_id" text NOT NULL,
  "address" text NOT NULL,
  "chain" text NOT NULL DEFAULT 'evm',
  "status" text NOT NULL DEFAULT 'active',
  "policy_id" uuid REFERENCES "signing_policies"("id") ON DELETE set null,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "wallet_events" (
  "id" uuid PRIMARY KEY,
  "wallet_id" uuid NOT NULL REFERENCES "app_wallets"("id") ON DELETE cascade,
  "event_type" text NOT NULL,
  "request_id" text,
  "payload_hash" text,
  "signature" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "proof_artifacts" (
  "id" uuid PRIMARY KEY,
  "artifact_hash" text NOT NULL,
  "storage_uri" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
