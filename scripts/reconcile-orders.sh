#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${NEXT_PUBLIC_APP_URL:-${NEXTAUTH_URL:-}}"
TOKEN="${INTERNAL_JOB_SECRET:-}"

if [[ -z "${BASE_URL}" ]]; then
  echo "NEXT_PUBLIC_APP_URL or NEXTAUTH_URL is required" >&2
  exit 1
fi

if [[ -z "${TOKEN}" ]]; then
  echo "INTERNAL_JOB_SECRET is required" >&2
  exit 1
fi

curl --fail-with-body \
  --silent \
  --show-error \
  --request POST \
  --header "Authorization: Bearer ${TOKEN}" \
  "${BASE_URL%/}/api/internal/orders/reconcile"
