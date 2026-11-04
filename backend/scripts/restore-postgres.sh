#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${BACKEND_DIR}/.env"

BACKUP_FILE="${1:-}"

if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Kullanım: bash scripts/restore-postgres.sh <yedek_dosyasi.sql.gz>" >&2
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Hata: Yedek dosyası bulunamadı: ${BACKUP_FILE}" >&2
  exit 1
fi

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

NODE_ENV="${NODE_ENV:-development}"

echo "============================================================"
echo " UYARI: PostgreSQL geri yükleme işlemi"
echo "============================================================"
echo "Dosya: ${BACKUP_FILE}"

if [[ "${NODE_ENV}" == "production" ]]; then
  echo
  echo "!!! PRODUCTION ORTAMI TESPİT EDİLDİ !!!"
  echo "Bu işlem mevcut veritabanı verilerinin üzerine yazabilir."
  echo "Devam etmeden önce güncel bir yedek aldığınızdan emin olun."
  echo "Mümkünse uygulamayı geçici olarak durdurun: npm run pm2:restart öncesi pm2 stop pos-backend"
fi

echo
read -r -p "Devam etmek istiyor musunuz? (yes/no): " CONFIRM

if [[ "${CONFIRM}" != "yes" ]]; then
  echo "İşlem iptal edildi."
  exit 0
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Hata: psql bulunamadı. PostgreSQL client tools kurulu olmalı." >&2
  exit 1
fi

echo "Geri yükleme başlıyor..."

if [[ -n "${DATABASE_URL:-}" ]]; then
  gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}"
elif [[ -n "${PGHOST:-}" || -n "${PGUSER:-}" || -n "${PGDATABASE:-}" ]]; then
  gunzip -c "${BACKUP_FILE}" | psql
else
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${DB_NAME:-pos_db}"
  DB_USER="${DB_USER:-postgres}"

  PGPASSWORD="${DB_PASSWORD:-${PGPASSWORD:-}}" gunzip -c "${BACKUP_FILE}" | psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}"
fi

echo "Geri yükleme tamamlandı."
echo "Uygulamayı yeniden başlatın: npm run pm2:restart"
