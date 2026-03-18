#!/usr/bin/env bash

set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  source .env
  set +a
fi

DATABASE_TARGET="${DATABASE_URL_POSTGRES:-${DATABASE_URL:-}}"
BACKUP_DIR="${BACKUP_DIR:-.backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_PATH="${1:-${BACKUP_DIR}/atelier-commerce-${TIMESTAMP}.dump}"
POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-atelier-commerce-postgres}"

if [[ -z "${DATABASE_TARGET}" ]]; then
  echo "DATABASE_URL_POSTGRES or DATABASE_URL is required" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump \
    --format=custom \
    --no-owner \
    --no-privileges \
    --file="${OUTPUT_PATH}" \
    "${DATABASE_TARGET}"
elif command -v docker >/dev/null 2>&1; then
  docker exec "${POSTGRES_CONTAINER_NAME}" pg_dump \
    --format=custom \
    --no-owner \
    --no-privileges \
    --username=atelier \
    --dbname=atelier_commerce > "${OUTPUT_PATH}"
else
  echo "pg_dump or docker is required" >&2
  exit 1
fi

echo "Backup created at ${OUTPUT_PATH}"
