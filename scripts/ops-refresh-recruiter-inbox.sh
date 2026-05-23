#!/usr/bin/env bash
# Refresh recruiter inbox demo rows on prod via OPS_ADMIN_TOKEN (no DATABASE_URL needed).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${VERIFY_PROD_API:-https://twin-production-bcd9.up.railway.app}"
API="${API%/}"

if [[ -z "${OPS_ADMIN_TOKEN:-}" ]] && [[ -f "$ROOT/.env.railway" ]]; then
  OPS_ADMIN_TOKEN="$(grep '^OPS_ADMIN_TOKEN=' "$ROOT/.env.railway" | cut -d= -f2- || true)"
fi
if [[ -z "${OPS_ADMIN_TOKEN:-}" ]]; then
  echo "Set OPS_ADMIN_TOKEN or add it to .env.railway" >&2
  exit 1
fi

COMPANY="${1:-Nova Hiring PL}"
payload=$(python3 -c "import json,sys; print(json.dumps({'company': sys.argv[1]}))" "$COMPANY")

curl -fsS -X POST "${API}/api/v1/ops/demo/recruiter-inbox-refresh" \
  -H "Authorization: Bearer ${OPS_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload" | python3 -m json.tool
