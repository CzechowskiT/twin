#!/usr/bin/env bash
# Canonical Redis broker reference for Railway (avoids malformed .env.railway values).
set -euo pipefail

RAILWAY_REDIS_REF='${{Redis.REDIS_URL}}'

# Returns a safe broker URL for railway variables set (never pass broken or template refs).
sanitize_redis_broker_ref() {
  local raw="${1:-}"
  raw="${raw%%\}\}}"
  raw="${raw%%\}}"
  if [[ -z "${raw// }" ]]; then
    printf '%s' "$RAILWAY_REDIS_REF"
    return
  fi
  if [[ "$raw" == *'${{'* ]] || [[ "$raw" == *"6379}}"* ]] || [[ "$raw" == *"6379}"* ]]; then
    printf '%s' "$RAILWAY_REDIS_REF"
    return
  fi
  if [[ "$raw" == redis://* ]] && [[ "$raw" == *'.railway.internal'* ]]; then
    printf '%s' "$raw"
    return
  fi
  printf '%s' "$RAILWAY_REDIS_REF"
}
