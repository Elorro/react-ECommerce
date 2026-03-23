#!/usr/bin/env bash

set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  source .env
  set +a
fi

BASE_URL="${NEXT_PUBLIC_APP_URL:-${NEXTAUTH_URL:-}}"
TOKEN="${INTERNAL_JOB_SECRET:-}"

if [[ -z "${BASE_URL}" ]]; then
  echo "NEXT_PUBLIC_APP_URL or NEXTAUTH_URL is required" >&2
  exit 1
fi

echo "Checking ${BASE_URL%/}/api/health"
curl --fail-with-body --silent --show-error "${BASE_URL%/}/api/health" >/dev/null

echo "Checking ${BASE_URL%/}/api/readiness"
curl --fail-with-body --silent --show-error "${BASE_URL%/}/api/readiness" >/dev/null

if [[ -n "${TOKEN}" ]]; then
  echo "Checking internal reconcile job"
  curl --fail-with-body \
    --silent \
    --show-error \
    --request POST \
    --header "Authorization: Bearer ${TOKEN}" \
    "${BASE_URL%/}/api/internal/orders/reconcile" >/dev/null
fi

echo "Basic smoke checks passed."
