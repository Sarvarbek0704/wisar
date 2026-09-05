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

# Eng kichik maqbul hajm (bayt). Bundan kichik dump = buzilgan/bo'sh — xato deb hisoblaymiz.
MIN_BYTES="${MIN_BYTES:-1000000}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F_%H%M)"
OUT="$BACKUP_DIR/wisar-$STAMP.sql.gz"

echo "[backup] $(date '+%F %T') $DB_NAME → $OUT"

# pg_dump yiqilsa gzip baribir 0 bilan tugashi mumkin — PIPESTATUS bilan haqiqiy holatni olamiz.
set +e
docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUT"
DUMP_RC=${PIPESTATUS[0]}
set -e

if [ "$DUMP_RC" -ne 0 ]; then
  echo "[backup] XATO: pg_dump $DUMP_RC kodi bilan tugadi. Nuqsonli fayl o'chirildi."
  rm -f "$OUT"
  exit 1
fi

SIZE=$(stat -c %s "$OUT" 2>/dev/null || echo 0)
if [ "$SIZE" -lt "$MIN_BYTES" ]; then
  echo "[backup] XATO: nusxa juda kichik ($SIZE bayt < $MIN_BYTES). Nuqsonli fayl o'chirildi."
  rm -f "$OUT"
  exit 1
fi

# gzip butunligini tekshiramiz
if ! gzip -t "$OUT" 2>/dev/null; then
  echo "[backup] XATO: gzip buzilgan. Nuqsonli fayl o'chirildi."
  rm -f "$OUT"
  exit 1
fi

# Faqat MUVAFFAQIYATLI nusxadan keyin eskilarini o'chiramiz —
# aks holda backup buzilganda mavjud nusxalar ham yo'qoladi.
find "$BACKUP_DIR" -name "wisar-*.sql.gz" -mtime +"$KEEP_DAYS" -delete

echo "[backup] OK — $(numfmt --to=iec "$SIZE" 2>/dev/null || echo "$SIZE bayt")"
ls -lh "$BACKUP_DIR"/wisar-*.sql.gz 2>/dev/null | tail -5
