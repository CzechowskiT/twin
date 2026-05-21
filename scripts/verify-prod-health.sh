#!/usr/bin/env bash
# Exit 1 when production API is missing critical ops flags (for CI or local smoke).
set -euo pipefail

API="${VERIFY_PROD_API:-https://twin-production-bcd9.up.railway.app}"
FE="${VERIFY_PROD_FRONTEND:-https://twin-sooty.vercel.app}"

echo "API: $API"
json=$(curl -fsS "${API%/}/api/v1/health?ops=1&db=1")
echo "$json" | python3 -m json.tool 2>/dev/null || echo "$json"

fail=0
check() {
  local key="$1"
  local want="$2"
  local got
  got=$(echo "$json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('$key'))")
  if [[ "$got" != "$want" ]]; then
    echo "FAIL: $key expected $want got $got"
    fail=1
  else
    echo "OK: $key=$got"
  fi
}

check status ok
check db_ok True
check ops_admin_configured True
check celery_task_always_eager False
check scrape_worker_ready True

code=$(curl -fsS -o /dev/null -w "%{http_code}" "${FE%/}/status" || echo "000")
if [[ "$code" != "200" ]]; then
  echo "FAIL: frontend /status HTTP $code"
  fail=1
else
  echo "OK: frontend /status HTTP 200"
fi

if [[ "$fail" -ne 0 ]]; then
  echo "Prod gaps remain — run ./scripts/apply-prod-autonomous.sh or paste clipboard vars on Railway."
  exit 1
fi
echo "Prod health: all critical flags OK"
