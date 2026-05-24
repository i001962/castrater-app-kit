#!/usr/bin/env bash
set -euo pipefail

SERVICE="${1:-}"

if [ -z "$SERVICE" ]; then
  docker compose -f infra/docker-compose.yml logs -f
else
  docker compose -f infra/docker-compose.yml logs -f "$SERVICE"
fi
