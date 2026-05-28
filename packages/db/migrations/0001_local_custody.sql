CREATE TABLE IF NOT EXISTS "custody_keys" (
  "id" uuid PRIMARY KEY,
  "provider" text NOT NULL,
  "curve" text NOT NULL,
  "encrypted_private_key" text NOT NULL,
  "public_key" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
