#!/usr/bin/env bash
set -euo pipefail

# Start all services for local development
echo "🟢 castrater-app-kit — dev mode"

# Ensure .env exists
if [ ! -f .env ]; then
  echo "⚠️  No .env found — copying from infra/.env.example"
  cp infra/.env.example .env
fi

# Start backing services (Redis + Postgres) via Docker Compose
echo "→ Starting Redis and Postgres..."
docker compose -f infra/docker-compose.yml up -d redis postgres

# Install dependencies if needed
if [ ! -d node_modules ]; then
  echo "→ Installing dependencies..."
  pnpm install
fi

# Run database migrations
echo "→ Running database migrations..."
pnpm db:migrate

# Start all apps with Turbo
echo "→ Starting dev servers (web + api)..."
pnpm dev
