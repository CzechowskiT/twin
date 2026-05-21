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

celery_json=$(curl -fsS "${API%/}/api/v1/health/celery-status" 2>/dev/null || echo "{}")
echo "Celery status:"
echo "$celery_json" | python3 -m json.tool 2>/dev/null || echo "$celery_json"
celery_eager=$(echo "$celery_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('celery_task_always_eager'))" 2>/dev/null || echo "None")
if [[ "$celery_eager" != "False" ]]; then
  echo "WARN: celery-status eager=$celery_eager (expected False for background beat)"
  fail=1
fi
beat_nightly=$(echo "$celery_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('beat_schedule_has_nightly'))" 2>/dev/null || echo "None")
if [[ "$beat_nightly" != "True" ]]; then
  echo "WARN: beat_schedule_has_nightly=$beat_nightly"
  fail=1
fi
worker_active=$(echo "$celery_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('worker_active'))" 2>/dev/null || echo "None")
celery_mode=$(echo "$celery_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('mode',''))" 2>/dev/null || echo "")
celery_err=$(echo "$celery_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null || echo "")
if [[ "$worker_active" != "True" ]]; then
  echo "FAIL: celery worker_active=$worker_active mode=$celery_mode error=$celery_err"
  fail=1
else
  echo "OK: celery worker_active=True"
fi
if [[ "$celery_err" == *"6379}"* ]] || [[ "$celery_err" == *"6379}}"* ]]; then
  echo "HINT: malformed REDIS URL on API/worker — run: ./scripts/railway-fix-redis-broker.sh"
fi

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
