#!/usr/bin/env bash
# Маалымат базасынын бэкабы: backups/olimp-YYYYMMDD-HHMMSS.sql.gz
# Колдонуу: DATABASE_URL=... ./scripts/backup-db.sh   (pg_dump керек)
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ] && [ -f "$(dirname "$0")/../.env" ]; then
  # shellcheck disable=SC1091
  set -a; . "$(dirname "$0")/../.env"; set +a
fi

: "${DATABASE_URL:?DATABASE_URL is not set}"

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/olimp-$(date +%Y%m%d-%H%M%S).sql.gz"

# Prisma's ?schema= parameter is not understood by pg_dump
pg_dump --no-owner --no-privileges "${DATABASE_URL%%\?*}" | gzip > "$FILE"
echo "Backup saved: $FILE"
