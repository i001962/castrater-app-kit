#!/usr/bin/env bash
set -euo pipefail

echo "🚀 castrater-app-kit — deploy"

# Ensure .env exists
if [ ! -f .env ]; then
  echo "❌ .env not found. Copy infra/.env.example and fill in values."
  exit 1
fi

echo "→ Building and starting containers..."
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d --build

echo "→ Verifying health..."
sleep 5
curl -sf http://127.0.0.1:4001/health && echo "✅ API healthy" || echo "⚠️  API health check failed"

echo ""
echo "✅ Deploy complete."
echo "   Configure Caddy using infra/Caddyfile.example"
echo "   Firewall: ensure only 22, 80, 443 are open"
