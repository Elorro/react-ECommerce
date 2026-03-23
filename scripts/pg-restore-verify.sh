#!/usr/bin/env bash

set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  source .env
  set +a
fi

INPUT_PATH="${1:-}"
POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-atelier-commerce-postgres}"
VERIFY_DB_NAME="${VERIFY_DB_NAME:-atelier_restore_verify_$(date +%s)}"

if [[ -z "${INPUT_PATH}" ]]; then
  echo "Usage: bash scripts/pg-restore-verify.sh <backup-file>" >&2
  exit 1
fi

if [[ ! -f "${INPUT_PATH}" ]]; then
  echo "Backup file not found: ${INPUT_PATH}" >&2
  exit 1
fi

cleanup() {
  if command -v dropdb >/dev/null 2>&1; then
    dropdb --if-exists "${VERIFY_DB_NAME}" >/dev/null 2>&1 || true
  elif command -v docker >/dev/null 2>&1; then
    docker exec "${POSTGRES_CONTAINER_NAME}" dropdb --if-exists --username=atelier "${VERIFY_DB_NAME}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

if command -v createdb >/dev/null 2>&1 && command -v psql >/dev/null 2>&1 && command -v pg_restore >/dev/null 2>&1; then
  createdb "${VERIFY_DB_NAME}"
  pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --dbname="${VERIFY_DB_NAME}" \
    "${INPUT_PATH}" >/dev/null
  psql "${VERIFY_DB_NAME}" -c 'SELECT COUNT(*) FROM "Product";' >/dev/null
elif command -v docker >/dev/null 2>&1; then
  docker exec "${POSTGRES_CONTAINER_NAME}" createdb --username=atelier "${VERIFY_DB_NAME}"
  docker exec -i "${POSTGRES_CONTAINER_NAME}" pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --username=atelier \
    --dbname="${VERIFY_DB_NAME}" < "${INPUT_PATH}" >/dev/null
  docker exec "${POSTGRES_CONTAINER_NAME}" psql --username=atelier --dbname="${VERIFY_DB_NAME}" -c 'SELECT COUNT(*) FROM "Product";' >/dev/null
else
  echo "createdb/pg_restore/psql or docker is required" >&2
  exit 1
fi

echo "Restore verification completed against temporary database ${VERIFY_DB_NAME}."
