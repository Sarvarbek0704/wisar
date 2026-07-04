#!/usr/bin/env bash
# Wisar DB backup — pg_dump (gzip) + eski nusxalarni tozalash.
# Ishlatish (VPS'da cron): 0 3 * * * /path/wisar/scripts/backup.sh
# Sozlash: quyidagi o'zgaruvchilarni yoki muhitni moslang.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-$(dirname "$0")/../docker-compose.prod.yml}"
DB_USER="${POSTGRES_USER:-wisar}"
DB_NAME="${POSTGRES_DB:-wisar}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F_%H%M)"
OUT="$BACKUP_DIR/wisar-$STAMP.sql.gz"

echo "[backup] $DB_NAME → $OUT"
docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUT"

# Eski nusxalarni o'chirish
find "$BACKUP_DIR" -name "wisar-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "[backup] tayyor. Saqlanayotgan nusxalar:"
ls -lh "$BACKUP_DIR"/wisar-*.sql.gz 2>/dev/null | tail -5
