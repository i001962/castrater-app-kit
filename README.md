# castrater-app-kit

`castrater-app-kit` is an MVP developer scaffold for:

- passkey authentication (WebAuthn)
- durable user/app/session records in Postgres (Drizzle)
- app-scoped embedded wallets
- qKMS signing adapter boundary
- wallet policy checks (placeholder)
- wallet audit events
- local proof/audit receipt placeholders

## Important scope notes

- This is **not production-ready**.
- This is **not** a Farcaster signer framework.
- This is **not** a replacement for Quilibrium, qKMS, or Q Storage.
- Mock qKMS mode is **dev-only** and unsafe for production.

## Current stack

- Fastify API (`apps/api`)
- React + Vite + Tailwind web app (`apps/web`)
- Drizzle ORM + Postgres (`packages/db`)
- Redis for challenge/session-supporting cache where useful
- qKMS adapter (`packages/qkms`)
- DB-backed wallet service (`packages/wallet`)

## MVP API flow

### Auth

- `POST /v1/auth/register/options`
- `POST /v1/auth/register/verify`
- `POST /v1/auth/login/options`
- `POST /v1/auth/login/verify`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

### Wallet

- `POST /v1/apps/default`
- `POST /v1/wallet/create`
- `GET /v1/wallets`
- `GET /v1/wallet/:walletId`
- `POST /v1/wallet/:walletId/sign-message`
- `GET /v1/wallet/:walletId/events`

## Deferred integrations

- Farcaster protocol write signer
- Farcaster signer delegation
- Mini App signature verification
- Q Storage production adapter
- Real qKMS provider integration
- Remote inference mode
- CLI scaffolder/generator
- Commitment receipt network

## Quickstart

```bash
pnpm install
cp infra/.env.example .env
pnpm type-check
pnpm build
pnpm dev
```

## Workspace scripts

- `pnpm dev`
- `pnpm lint`
- `pnpm type-check`
- `pnpm build`

## License

MIT

