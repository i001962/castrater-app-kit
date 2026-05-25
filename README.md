# castrater-app-kit: Auth + qKMS App Wallet Scaffold

A TypeScript scaffold for self-hosted apps that need passkey authentication, app-scoped embedded wallets, and a qKMS signing boundary.

## Status

Developer preview.

- WebAuthn/passkeys are implemented for local development on `localhost`
- wallet state, app accounts, sessions, and audit events are persisted in Postgres
- qKMS defaults to a mock adapter for development
- this repo is not production-ready
- this repo is not a Farcaster signer framework
- this repo does not replace Quilibrium, qKMS, or Q Storage

## Product Truth

This scaffold is built around:

- passkey authentication for the human
- durable `users`, `sessions`, `app_accounts`, and `app_wallets`
- app-scoped wallets created through a qKMS adapter boundary
- explicit API-side policy checks before signing
- wallet audit events and local proof placeholder artifacts

Deferred integrations:

- Farcaster protocol writing
- Farcaster signer delegation
- Mini App verification
- real qKMS provider integration
- Q Storage production adapter
- remote inference
- CLI project generator

## Architecture

The model is:

1. A human authenticates with a passkey.
2. The API creates a session cookie and durable `users` record.
3. The user is scoped into an `app_account`.
4. The API asks qKMS to create or use a signing key.
5. Wallet actions are checked, executed, and written to `wallet_events`.
6. A local proof placeholder artifact is stored for audit/receipt flows later.

Security properties of the scaffold:

- browser never talks directly to qKMS
- all signing requests go through API policy checks
- session cookies are `httpOnly`
- no raw private keys are stored in the app
- the mock qKMS client is unsafe for production custody

## Repo Layout

```text
apps/
  api/   Fastify API for auth, sessions, apps, wallets, and status
  web/   React/Vite demo UI for passkeys and wallet flow

packages/
  db/        Drizzle schema + migration runner
  qkms/      qKMS adapter boundary + development mock
  wallet/    DB-backed wallet service and audit event logic
  proofs/    proof hash helpers and local placeholder artifact shapes
  storage/   local storage helpers
  kv/        Redis helpers
  hypersnap/ optional read-only integration package for later use
  config/
  shared/

infra/
  docker-compose.yml
  docker-compose.prod.yml
  .env.example

scripts/
  dev.sh
  doctor.sh
  deploy.sh
  backup.sh
  restore.sh
  logs.sh
```

## Database

Drizzle/Postgres tables included in the scaffold:

- `users`
- `passkey_credentials`
- `sessions`
- `apps`
- `app_accounts`
- `app_wallets`
- `signing_policies`
- `wallet_events`
- `proof_artifacts`

## Quickstart

```bash
pnpm install
cp infra/.env.example .env
pnpm db:migrate
pnpm dev
```

Local endpoints:

- Web: [http://localhost:4000](http://localhost:4000)
- API: [http://localhost:4001](http://localhost:4001)
- Health: [http://localhost:4001/health](http://localhost:4001/health)

## Demo Flow

1. Open the auth page.
2. Register a passkey on `localhost`.
3. Log in with the passkey.
4. Create a demo app wallet.
5. Sign a test message.
6. Inspect the persisted wallet audit event.

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## API Surface

Auth:

- `POST /v1/auth/register/options`
- `POST /v1/auth/register/verify`
- `POST /v1/auth/login/options`
- `POST /v1/auth/login/verify`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

Apps:

- `POST /v1/apps/default`

Wallets:

- `POST /v1/wallet/create`
- `GET /v1/wallets`
- `GET /v1/wallet/:walletId`
- `POST /v1/wallet/:walletId/sign-message`
- `GET /v1/wallet/:walletId/events`

Status:

- `GET /health`
- `GET /v1/status`

## WebAuthn Notes

- passkeys work locally on `localhost` because it is treated as a secure context
- WebAuthn registration and authentication challenges are stored in Redis with a short TTL when Redis is available
- if Redis is unavailable in development, the API falls back to an in-memory challenge store and reports that in status/health

## Docker Compose

`infra/docker-compose.yml` now reflects the narrower MVP:

- web
- api
- postgres
- redis

The old worker/inference demo stack is intentionally removed from the main path.

## Acceptance Checklist

- repo installs cleanly
- migrations run against Postgres
- API boots
- web boots
- passkey registration/login works on localhost
- authenticated user can create an app wallet
- authenticated user can sign a test message
- wallet events persist in Postgres
- docs no longer claim production readiness
