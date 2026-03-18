#!/usr/bin/env bash

set -euo pipefail

required_vars=(
  DATABASE_URL
  NEXTAUTH_SECRET
  NEXTAUTH_URL
  NEXT_PUBLIC_APP_URL
  INTERNAL_JOB_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
)

optional_pairs=(
  "AUTH_GOOGLE_ID AUTH_GOOGLE_SECRET"
  "AUTH_GITHUB_ID AUTH_GITHUB_SECRET"
)

missing=()

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    missing+=("${var_name}")
  fi
done

for pair in "${optional_pairs[@]}"; do
  left="${pair%% *}"
  right="${pair##* }"
  left_set="${!left:-}"
  right_set="${!right:-}"

  if [[ -n "${left_set}" && -z "${right_set}" ]]; then
    missing+=("${right}")
  fi

  if [[ -z "${left_set}" && -n "${right_set}" ]]; then
    missing+=("${left}")
  fi
done

if [[ "${DATABASE_URL:-}" == file:* ]]; then
  missing+=("DATABASE_URL must not point to SQLite in production")
fi

if [[ -z "${AUTH_GOOGLE_ID:-}${AUTH_GITHUB_ID:-}" ]]; then
  missing+=("At least one OAuth provider pair must be configured")
fi

if [[ -n "${NEXTAUTH_URL:-}" && -n "${NEXT_PUBLIC_APP_URL:-}" && "${NEXTAUTH_URL%/}" != "${NEXT_PUBLIC_APP_URL%/}" ]]; then
  missing+=("NEXTAUTH_URL and NEXT_PUBLIC_APP_URL must match")
fi

if [[ "${E2E_STRIPE_MODE:-}" == "mock" ]]; then
  missing+=("E2E_STRIPE_MODE=mock must not be enabled in production")
fi

if (( ${#missing[@]} > 0 )); then
  printf 'Missing or incomplete production env vars:\n' >&2
  printf ' - %s\n' "${missing[@]}" >&2
  exit 1
fi

echo "Production environment variables look complete."
