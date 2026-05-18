#!/usr/bin/env bash
# P0 smoke: verify deployed API answers (see docs/P0_CHECKLIST.md).
# Usage:
#   BASE_URL=https://your-api.up.railway.app ./scripts/smoke-p0.sh
#   BASE_URL=https://your-api.up.railway.app ./scripts/smoke-p0.sh --db
set -euo pipefail

BASE_URL="${BASE_URL:-}"
if [[ -z "${BASE_URL}" ]]; then
  echo "Set BASE_URL to your public API root (no trailing slash), e.g. https://twin-api-xxxx.up.railway.app" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
HEALTH="${BASE_URL}/api/v1/health"

echo "GET ${HEALTH}"
code="$(curl -sS -o /tmp/twin-health.json -w "%{http_code}" "${HEALTH}")"
if [[ "${code}" != "200" ]]; then
  echo "Expected HTTP 200, got ${code}" >&2
  cat /tmp/twin-health.json >&2 || true
  exit 1
fi
grep -q '"status"' /tmp/twin-health.json || {
  echo "Unexpected body (missing status):" >&2
  cat /tmp/twin-health.json >&2
  exit 1
}
echo "health OK: $(tr -d '\n' </tmp/twin-health.json)"

if [[ "${1:-}" == "--db" ]]; then
  echo "GET ${HEALTH}?db=1"
  code2="$(curl -sS -o /tmp/twin-health-db.json -w "%{http_code}" "${HEALTH}?db=1")"
  if [[ "${code2}" != "200" ]]; then
    echo "Expected HTTP 200 for db probe, got ${code2}" >&2
    cat /tmp/twin-health-db.json >&2 || true
    exit 1
  fi
  echo "health+db OK: $(tr -d '\n' </tmp/twin-health-db.json)"
fi

echo "P0 API smoke passed."
