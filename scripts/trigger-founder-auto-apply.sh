#!/usr/bin/env bash
# Trigger founder manual auto-apply test on production (no browser).
# Auth: founder password env vars, or JWT minted from SECRET_KEY in .env.railway (ops/dev).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"

API_URL="${API_URL:-https://twin-production-bcd9.up.railway.app}"
FOUNDER_EMAIL="${FOUNDER_DEMO_EMAIL:-czechowski@protonmail.ch}"
ENV_FILE="${RAILWAY_ENV_FILE:-$ROOT/.env.railway}"

load_env_key() {
  local key="$1"
  if [[ -n "${!key:-}" ]]; then
    return 0
  fi
  [[ -f "$ENV_FILE" ]] || return 1
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 || true)"
  [[ -n "$line" ]] || return 1
  export "$line"
}

for k in API_URL SECRET_KEY INVESTOR_DEMO_PASSWORD DEMO_USER_PASSWORD FOUNDER_PASSWORD; do
  load_env_key "$k" || true
done

fetch_token_via_login() {
  local password="$1"
  local resp
  resp="$(curl -sS -m 30 -X POST "${API_URL}/api/v1/auth/login/json" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${FOUNDER_EMAIL}\",\"password\":\"${password}\"}")"
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("access_token",""))' <<<"$resp"
}

TOKEN=""
for pw_var in INVESTOR_DEMO_PASSWORD DEMO_USER_PASSWORD FOUNDER_PASSWORD; do
  pw="${!pw_var:-}"
  if [[ -n "$pw" ]]; then
    TOKEN="$(fetch_token_via_login "$pw" || true)"
    if [[ -n "$TOKEN" ]]; then
      break
    fi
  fi
done

if [[ -z "$TOKEN" ]]; then
  if [[ -z "${SECRET_KEY:-}" ]]; then
    echo "No founder password env and no SECRET_KEY in ${ENV_FILE}." >&2
    echo "One-liner (after export SECRET_KEY from Railway twin service):" >&2
    echo "  FOUNDER_DEMO_EMAIL=${FOUNDER_EMAIL} ./scripts/trigger-founder-auto-apply.sh" >&2
    echo "Or login manually and POST ${API_URL}/api/v1/auto-apply/trigger with Bearer JWT." >&2
    exit 1
  fi
  TOKEN="$(python3 <<PY
import os, sys
sys.path.insert(0, "${ROOT}/backend")
from app.core.security import create_access_token
print(create_access_token("${FOUNDER_EMAIL}"))
PY
)"
fi

if [[ "${RUN_ENSURE_FOUNDER_PROFILE:-0}" == "1" ]]; then
  "${ROOT}/scripts/run-ensure-founder-demo-profile.sh"
fi

echo "== health =="
curl -sS -m 20 "${API_URL}/api/v1/health" | python3 -m json.tool

echo "== trigger auto-apply (founder) =="
curl -sS -m 120 -X POST "${API_URL}/api/v1/auto-apply/trigger" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | python3 -m json.tool

echo "== demo snapshot (source) =="
curl -sS -m 20 "${API_URL}/api/v1/demo/snapshot" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print('source=', d.get('source'), 'auto_apply=', d.get('auto_apply'))"

echo "== last platform sweep (auto_apply_runs; manual trigger does not write this row) =="
curl -sS -m 20 "${API_URL}/api/v1/auto-apply/last-sweep" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -m json.tool

echo "== verify nightly observability (ops token optional) =="
VERIFY_JWT="${TOKEN}" OPS_ADMIN_TOKEN="${OPS_ADMIN_TOKEN:-}" "${ROOT}/scripts/verify-nightly-auto-apply.sh" || true
