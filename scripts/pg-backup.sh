#!/usr/bin/env bash

set -euo pipefail

DATABASE_TARGET="${DATABASE_URL_POSTGRES:-${DATABASE_URL:-}}"
BACKUP_DIR="${BACKUP_DIR:-.backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_PATH="${1:-${BACKUP_DIR}/atelier-commerce-${TIMESTAMP}.dump}"

if [[ -z "${DATABASE_TARGET}" ]]; then
  echo "DATABASE_URL_POSTGRES or DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="${OUTPUT_PATH}" \
  "${DATABASE_TARGET}"

echo "Backup created at ${OUTPUT_PATH}"
