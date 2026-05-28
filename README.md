# castrater-app-kit: Selectable Auth + Custody Scaffold

A TypeScript scaffold system for self-hosted apps that need human auth, app-scoped wallets, and a signer custody boundary, with real selectable defaults instead of a single hard-coded flow.

## Status

Developer preview.

- passkey auth and cookie sessions work locally on `localhost`
- demo auth mode is available for flows that want to skip human auth initially
- wallet state, app accounts, sessions, and audit events persist in Postgres
- local custody now creates and signs with real secp256k1 keys for development
- Quilibrium SDK custody is a named provider path, but still depends on SDK package availability and account credentials
- this repo is not production-ready custody

## Product Truth

This repo now serves two purposes:

1. It remains a working reference scaffold in this monorepo.
2. It can generate new project repos from a small set of runnable selections.

Current selection axes:

- auth provider: `passkey` or `demo`
- session provider: `cookie` or `none`
- custody provider: `local`, `mock`, or `quilibrium-sdk`

Current supported runnable combinations:

- `passkey + cookie + local`
- `passkey + cookie + mock`
- `passkey + cookie + quilibrium-sdk`
- `demo + none + local`
- `demo + none + mock`
- `demo + none + quilibrium-sdk`
- `demo + cookie + local`
- `demo + cookie + mock`
- `demo + cookie + quilibrium-sdk`

Constraint:

- `passkey` currently requires `cookie` sessions

## Working Default Flow

The default scaffold path is:

1. A human authenticates with a passkey.
2. The API creates a durable session.
3. The user is scoped into an `app_account`.
4. The API creates or loads an app wallet through the selected custody provider.
5. Wallet actions go through policy checks and are recorded as `wallet_events`.
6. A local proof placeholder artifact is stored for future receipt flows.

## Current Layers

- human auth
- app session and records
- app wallet
- custody provider
- audit/proof placeholders

Farcaster/Hypersnap protocol signer delegation is still a future subsystem and should be modeled separately from app wallets.

## Real Local Custody

The default custody provider is now `local`, not `mock`.

What that means:

- the scaffold generates real `secp256k1` keys
- private keys are encrypted before being stored
- wallet create/sign flows are real and durable
- this is still unsafe for production custody because key material is app-managed

Use `mock` only for development shortcuts. Use `quilibrium-sdk` only when you have a QNZM/QKMS account, app credentials, and an installable SDK package/source from Quilibrium. The public SDK repo exists, but the Node package is not currently available from npm under `@quilibrium/qkms-sdk-node`.

## Repo Layout

```text
apps/
  api/   Fastify API for auth, sessions, apps, wallets, and status
  web/   React/Vite UI for auth, wallet flow, and runtime status

packages/
  config/      shared scaffold selection types and defaults
  create-app/  project generator CLI
  db/          Drizzle schema + migration runner
  qkms/        mock and Quilibrium SDK qKMS boundary
  wallet/      DB-backed wallet service and audit event logic
  proofs/      proof hash helpers and local placeholder artifact shapes
  storage/     local storage helpers
  kv/          Redis helpers
  hypersnap/   optional future-facing integration package
  shared/

infra/
  docker-compose.yml
  docker-compose.prod.yml
  .env.example
```

## Quickstart

```bash
pnpm install
cp infra/.env.example .env
docker compose -f infra/docker-compose.yml up -d postgres redis
pnpm db:migrate
pnpm dev
```

Local endpoints:

- Web: [http://localhost:4000](http://localhost:4000)
- API: [http://localhost:4001](http://localhost:4001)
- Health: [http://localhost:4001/health](http://localhost:4001/health)

## Generate A Project

Generate a new runnable repo with explicit selections:

```bash
pnpm scaffold:new -- \
  --out-dir=../my-wallet-app \
  --project-name="My Wallet App" \
  --auth=passkey \
  --session=cookie \
  --custody=local
```

Then:

```bash
cd ../my-wallet-app
pnpm install
cp infra/.env.example .env
docker compose -f infra/docker-compose.yml up -d postgres redis
pnpm db:migrate
pnpm dev
```

The generator writes:

- a curated copy of the scaffold
- `scaffold.selections.json`
- a preconfigured `infra/.env.example`

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

## Tests And Validation

```bash
pnpm typecheck
pnpm lint
pnpm test
```

The generator has also been smoke-tested locally by emitting a new scaffold repo under `/private/tmp`.

## Next Likely Steps

- add provider interfaces for protocol signers separate from app wallets
- finish the Quilibrium SDK custody provider against live account credentials
- replace the placeholder SDK import once Quilibrium publishes or documents the installable Node package path
- add more generator presets instead of raw flags
- add Farcaster/Hypersnap signer authorization strategies as optional modules
