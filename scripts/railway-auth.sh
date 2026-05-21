#!/usr/bin/env bash
# Export RAILWAY_TOKEN from .env.railway for non-interactive CLI (Account → Tokens).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${RAILWAY_ENV_FILE:-$ROOT/.env.railway}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  # Only load token — avoid sourcing MAIL_FROM with spaces breaking bash
  token=$(grep -E '^RAILWAY_TOKEN=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' || true)
  set +a
  if [[ -n "${token// }" ]]; then
    export RAILWAY_TOKEN="$token"
  fi
fi
