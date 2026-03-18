#!/usr/bin/env bash

set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  source .env
  set +a
fi

DATABASE_TARGET="${DATABASE_URL_POSTGRES:-${DATABASE_URL:-}}"
POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-atelier-commerce-postgres}"

if [[ -z "${DATABASE_TARGET}" ]]; then
  echo "DATABASE_URL_POSTGRES or DATABASE_URL is required" >&2
  exit 1
fi

echo "Waiting for PostgreSQL..."

if command -v pg_isready >/dev/null 2>&1; then
  until pg_isready -d "${DATABASE_TARGET}" >/dev/null 2>&1; do
    sleep 1
  done
elif command -v docker >/dev/null 2>&1; then
  until docker exec "${POSTGRES_CONTAINER_NAME}" pg_isready -U atelier -d atelier_commerce >/dev/null 2>&1; do
    sleep 1
  done
else
  echo "pg_isready or docker is required" >&2
  exit 1
fi

echo "PostgreSQL is ready."
