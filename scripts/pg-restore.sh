#!/usr/bin/env bash

set -euo pipefail

DATABASE_TARGET="${DATABASE_URL_POSTGRES:-${DATABASE_URL:-}}"
INPUT_PATH="${1:-}"

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

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required" >&2
  exit 1
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="${DATABASE_TARGET}" \
  "${INPUT_PATH}"

echo "Restore completed from ${INPUT_PATH}"
