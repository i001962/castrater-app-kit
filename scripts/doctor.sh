#!/usr/bin/env bash
set -euo pipefail

echo "🩺 castrater-app-kit — doctor"
PASS=0
FAIL=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "  ✅ $name"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "── System ──────────────────────────────"
check "node >= 20"     "node --version | grep -E 'v(2[0-9]|[3-9][0-9])'"
check "pnpm installed" "pnpm --version"
check "docker installed" "docker --version"
check "docker compose" "docker compose version"

echo ""
echo "── Files ───────────────────────────────"
check ".env exists"        "[ -f .env ]"
check "storage/uploads"    "[ -d storage/uploads ]"
check "storage/proofs"     "[ -d storage/proofs ]"

echo ""
echo "── Services ────────────────────────────"
check "Redis reachable"    "docker compose -f infra/docker-compose.yml exec -T redis redis-cli ping 2>/dev/null | grep -q PONG"
check "API healthy"        "curl -sf http://127.0.0.1:4001/health"
check "Web reachable"      "curl -sf http://127.0.0.1:4000"

echo ""
echo "── Results ─────────────────────────────"
echo "  Passed: $PASS   Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
