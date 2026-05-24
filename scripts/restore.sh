#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./scripts/restore.sh <backup_file.sql.gz>"
  exit 1
fi

echo "⚠️  Restoring from: $BACKUP_FILE"
echo "   This will OVERWRITE the current database."
read -p "Continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo "→ Restoring Postgres..."
gunzip -c "$BACKUP_FILE" | docker compose -f infra/docker-compose.yml exec -T postgres \
  psql -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-castrater}"

echo "✅ Restore complete."
