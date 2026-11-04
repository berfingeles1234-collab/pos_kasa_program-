#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${BACKEND_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

if [[ "${BACKUP_DIR}" != /* ]]; then
  BACKUP_DIR="${BACKEND_DIR}/${BACKUP_DIR#./}"
fi

mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/pos_backup_${TIMESTAMP}.sql.gz"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Hata: pg_dump bulunamadı. PostgreSQL client tools kurulu olmalı." >&2
  exit 1
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "Yedek alınıyor (DATABASE_URL)..."
  pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"
elif [[ -n "${PGHOST:-}" || -n "${PGUSER:-}" || -n "${PGDATABASE:-}" ]]; then
  echo "Yedek alınıyor (PG* env)..."
  pg_dump | gzip > "${BACKUP_FILE}"
else
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${DB_NAME:-pos_db}"
  DB_USER="${DB_USER:-postgres}"

  echo "Yedek alınıyor (${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME})..."
  PGPASSWORD="${DB_PASSWORD:-${PGPASSWORD:-}}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    | gzip > "${BACKUP_FILE}"
fi

if [[ ! -s "${BACKUP_FILE}" ]]; then
  echo "Hata: Yedek dosyası oluşturulamadı veya boş." >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

echo "Yedek oluşturuldu: ${BACKUP_FILE}"

if [[ "${BACKUP_RETENTION_DAYS}" =~ ^[0-9]+$ ]] && [[ "${BACKUP_RETENTION_DAYS}" -gt 0 ]]; then
  DELETED_COUNT="$(find "${BACKUP_DIR}" -type f -name 'pos_backup_*.sql.gz' -mtime +"${BACKUP_RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')"
  echo "${BACKUP_RETENTION_DAYS} günden eski ${DELETED_COUNT} yedek silindi."
fi

echo "Tamamlandı."
