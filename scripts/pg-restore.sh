#!/usr/bin/env bash

set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  source .env
  set +a
fi

DATABASE_TARGET="${DATABASE_URL_POSTGRES:-${DATABASE_URL:-}}"
INPUT_PATH="${1:-}"
POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-atelier-commerce-postgres}"

if [[ -z "${DATABASE_TARGET}" ]]; then
  echo "DATABASE_URL_POSTGRES or DATABASE_URL is required" >&2
  exit 1
fi

if [[ -z "${INPUT_PATH}" ]]; then
  echo "Usage: bash scripts/pg-restore.sh <backup-file>" >&2
  exit 1
fi

if [[ ! -f "${INPUT_PATH}" ]]; then
  echo "Backup file not found: ${INPUT_PATH}" >&2
  exit 1
fi

if command -v pg_restore >/dev/null 2>&1; then
  pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --dbname="${DATABASE_TARGET}" \
    "${INPUT_PATH}"
elif command -v docker >/dev/null 2>&1; then
  docker exec -i "${POSTGRES_CONTAINER_NAME}" pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --username=atelier \
    --dbname=atelier_commerce < "${INPUT_PATH}"
else
  echo "pg_restore or docker is required" >&2
  exit 1
fi

echo "Restore completed from ${INPUT_PATH}"
