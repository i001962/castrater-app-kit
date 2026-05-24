#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

echo "📦 castrater-app-kit — backup"

# Backup Postgres
echo "→ Backing up Postgres..."
docker compose -f infra/docker-compose.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-castrater}" \
  | gzip > "$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

# Backup storage directory
echo "→ Backing up storage..."
tar -czf "$BACKUP_DIR/storage_$TIMESTAMP.tar.gz" storage/

echo "✅ Backup complete: $BACKUP_DIR"
