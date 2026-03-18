#!/usr/bin/env bash

set -euo pipefail

DATABASE_TARGET="${DATABASE_URL_POSTGRES:-${DATABASE_URL:-}}"

if [[ -z "${DATABASE_TARGET}" ]]; then
  echo "DATABASE_URL_POSTGRES or DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "pg_isready is required" >&2
  exit 1
fi

echo "Waiting for PostgreSQL..."
until pg_isready -d "${DATABASE_TARGET}" >/dev/null 2>&1; do
  sleep 1
done

echo "PostgreSQL is ready."
