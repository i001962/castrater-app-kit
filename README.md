# castrater-app-kit

A minimal, production-ready self-hosted app kit for building sovereign web apps that run on a single Linux server using Docker Compose and host-level Caddy.

Built to **support** Quilibrium ecosystem features — not replace them.

---

## What This Is

A reusable scaffold for building apps that integrate with:

- **Quilibrium** — via storage and proof adapters
- **qKMS** — for key custody and signing (adapter only)
- **HyperSnap** — for Farcaster user data
- **Farcaster Mini Apps** — SDK integration and manifest support
- **Q Storage** — as a future production durable-storage target

Default stack: TypeScript · React + Vite · Tailwind · Fastify · Redis · BullMQ · Postgres · Drizzle ORM · Docker Compose · Caddy (host-level) · pnpm workspaces · Turbo · Zod · Pino

---

## What This Is NOT

| This kit does NOT… | Use instead… |
|---|---|
| Replace Quilibrium | [Quilibrium network](https://quilibrium.com) |
| Replace qKMS | Configure `QKMS_URL` + `QKMS_API_KEY` |
| Replace Q Storage | Q Storage / Quilibrium storage adapter |
| Replace HyperSnap | [HyperSnap](https://hypersnap.castrater.xyz) |
| Replace Farcaster identity | Farcaster / SIWF / Warpcast |
| Run heavy inference inline | Worker-queued Ollama / remote API |

---

## What It Replaces Operationally

| Cloud service | Self-hosted equivalent |
|---|---|
| Vercel functions | Fastify API + BullMQ workers |
| Upstash KV | Redis (local dev) |
| Vercel cron | BullMQ repeatable jobs |
| Cloud blob storage | Local dev storage + Q Storage adapter |

---

## Repo Structure

```
castrater-app-kit/
  apps/
    web/          # React + Vite + Tailwind frontend (port 4000)
    api/          # Fastify API server (port 4001)
  workers/
    jobs/         # BullMQ worker
  packages/
    config/       # Shared constants
    shared/       # Shared types + errors
    db/           # Drizzle ORM schema + client
    kv/           # Redis KV wrapper
    queue/        # BullMQ wrapper + job names
    storage/      # Local file storage adapter
    hypersnap/    # HyperSnap client
    farcaster/    # Farcaster helpers
    miniapp/      # Farcaster Mini App SDK helpers
    qkms/         # qKMS adapter (mock + remote)
    wallet/       # App-scoped wallet logic
    proofs/       # Proof artifact adapter
    inference/    # Inference adapter (mock/local/remote)
    create-castrater-app/  # CLI scaffolder
  infra/
    docker-compose.yml
    docker-compose.prod.yml
    Caddyfile.example
    .env.example
  storage/        # Local dev file storage (mounted into containers)
  scripts/        # dev, deploy, backup, restore, logs, doctor
```

---

## Local Dev Quickstart

```bash
# 1. Clone and install
git clone https://github.com/i001962/castrater-app-kit.git
cd castrater-app-kit
pnpm install

# 2. Set up environment
cp infra/.env.example .env
# Edit .env — defaults work for local dev

# 3. Start backing services + dev servers
bash scripts/dev.sh
```

- Web: http://localhost:4000
- API: http://localhost:4001
- Health: http://localhost:4001/health

---

## Production Deploy (Ubuntu + Caddy)

### 1. Install dependencies on your server

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# pnpm + Node
curl -fsSL https://get.pnpm.io/install.sh | sh
```

### 2. Configure Caddy

```bash
sudo cp infra/Caddyfile.example /etc/caddy/Caddyfile
# Edit with your actual domains
sudo systemctl reload caddy
```

### 3. Deploy

```bash
cp infra/.env.example .env
# Fill in POSTGRES_PASSWORD, QKMS_URL (if used), etc.

bash scripts/deploy.sh
```

### 4. Firewall

```bash
# Only expose 22, 80, 443
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
# Never expose 4000, 4001, 6379, 5432
```

---

## Cloudflare DNS Notes

1. Point your domain's A record to your server IP
2. Enable Cloudflare proxy (orange cloud) for DDoS protection
3. Set SSL/TLS mode to **Full (strict)** — Caddy handles the origin cert
4. If using Cloudflare Tunnel: skip Caddy and route directly

---

## Farcaster Mini App Setup

> **TODO**: Always verify current field names at [Farcaster Mini Apps Spec](https://miniapps.farcaster.xyz/docs/specification). Fields may change.

### 1. Manifest

Your Mini App is identified by its fully qualified domain. Publish a manifest at:

```
https://your-domain.com/.well-known/farcaster.json
```

Copy the example and fill in real values:

```bash
cp apps/web/public/.well-known/farcaster.json.example \
   apps/web/public/.well-known/farcaster.json
# Edit: set name, iconUrl, homeUrl, accountAssociation, etc.
```

### 2. Account Association

The `accountAssociation` field links the domain to a Farcaster account. Generate it via Warpcast or Farcaster developer tools — **do not fabricate signatures**.

### 3. Hosted Manifests

Farcaster may also support hosted manifests via Farcaster developer tools. Check current docs for whether you can register your manifest there instead of serving it yourself.

### 4. SDK Initialization

```typescript
// In apps/web/src/main.tsx — already wired up:
import { ready } from '@castrater/miniapp';
ready(); // calls sdk.actions.ready() when inside Farcaster client, no-op otherwise
```

To use the real Farcaster Mini App SDK:

```bash
pnpm add @farcaster/miniapp-sdk --filter @castrater/miniapp
```

Then update `packages/miniapp/src/index.ts` — follow the `TODO` comments.

### 5. OG / Embed Metadata

Add embed meta tags to your `index.html`:

```html
<!-- TODO: verify with current Farcaster Mini Apps spec -->
<meta name="fc:frame" content="vNext" />
<meta name="fc:frame:home_url" content="https://your-domain.com" />
<meta name="fc:frame:icon_url" content="https://your-domain.com/og/icon.png" />
```

Use `buildMiniAppEmbedTags()` from `@castrater/miniapp` to generate these programmatically.

### 6. Testing with Remote URL

During development, expose your local server using Cloudflare Tunnel or ngrok:

```bash
# Cloudflare Tunnel (free, no account required for quick test)
cloudflared tunnel --url http://localhost:4000

# ngrok
ngrok http 4000
```

Use the generated HTTPS URL as your Mini App `homeUrl` for testing in Warpcast.

---

## Wallet Model

```
sovereign user identity
  └── app account (per-app)
        └── app wallet (qKMS-backed)
              └── signing events (audited)
```

- **No raw private keys** are ever stored or returned
- All signing delegated to **qKMS** (`QKMS_URL` + `QKMS_API_KEY`)
- `MockQkmsClient` is for local dev only — **UNSAFE for production**
- Browser **never** talks directly to qKMS — only API/worker processes do
- Wallet actions are recorded as auditable events

### Tables (Drizzle / Postgres)

`users` · `apps` · `app_accounts` · `app_wallets` · `wallet_events` · `signing_policies`

---

## Quilibrium-Backed Proof Model

```
artifact (data)  →  hash  →  proof record  →  storage
                                    ↑
                            verifier can check
```

- **Local dev**: artifacts stored in `storage/proofs/` as JSON, hashed with SHA-256
- **Production intent**: swap `@castrater/proofs` adapter to use Q Storage / Quilibrium APIs
- **Public proof ≠ public data**: encrypted artifacts can still have public attestations
- `local-dev` backend is a **development stand-in only** — not suitable for production attestations

### Table: `proof_artifacts`

`proofId` · `artifactHash` · `storageUri` · `signer` · `backend` · `createdAt`

---

## Inference Model

- Inference is **always async** — API enqueues a job, worker processes it
- Never run heavy inference inline in the API server
- Three modes: `mock` (default) · `local` (Ollama-compatible) · `remote`

### Local mode (Ollama)

```bash
# Start Ollama via Docker Compose inference profile
docker compose -f infra/docker-compose.yml --profile inference up -d ollama

# Pull a model
docker exec -it <ollama-container> ollama pull llama3.2
```

Set in `.env`:
```
INFERENCE_MODE=local
INFERENCE_BASE_URL=http://localhost:11434
INFERENCE_MODEL=llama3.2
```

> **Note**: CPU-only inference is supported but experimental and slow.
> Resource cap: 4 CPUs, 12 GB RAM (configurable in `docker-compose.yml`).

---

## Migration from Next.js / Vercel

| Vercel/Next | castrater-app-kit |
|---|---|
| `app/api/route.ts` | `apps/api/src/routes/*.ts` (Fastify) |
| Vercel KV | Redis via `@castrater/kv` |
| Vercel Cron | BullMQ repeatable jobs via `@castrater/queue` |
| `next/image`, `next/og` | Vite + custom OG helpers |
| Vercel Blob | Local `@castrater/storage` → Q Storage adapter |
| Vercel Edge Functions | Fastify plugins |

---

## CLI

```bash
npx create-castrater-app my-app
```

Prompts for:
- Project name, domain, API domain
- Farcaster / Mini App support
- qKMS wallets
- Quilibrium proof/storage adapters
- Inference (none / mock / local / remote)
- Postgres, workers, static storage

Generates `.env.example`, `Caddyfile.example`, and a `README.md`.
Never generates real secrets. Use `--force` to overwrite an existing directory.

---

## Environment Variables Reference

See `infra/.env.example` for the full list.

Key variables:

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |
| `DATABASE_URL` | — | Postgres connection (optional) |
| `QKMS_URL` | — | qKMS endpoint (optional; uses mock if unset) |
| `HYPERSNAP_URL` | `https://hypersnap.castrater.xyz` | HyperSnap endpoint |
| `INFERENCE_MODE` | `mock` | `mock` / `local` / `remote` |
| `STORAGE_BASE_DIR` | `/app/storage` | Base directory for local file storage |

---

## License

MIT
