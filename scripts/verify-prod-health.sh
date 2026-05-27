#!/usr/bin/env bash
# Exit 1 when production API is missing critical public health flags (for CI or local smoke).
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

check_if_present() {
  local key="$1"
  local want="$2"
  local got
  got=$(echo "$json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if '$key' not in d:
    print('__MISSING__')
else:
    print(d.get('$key'))
")
  if [[ "$got" == "__MISSING__" ]]; then
    echo "SKIP: $key not in public health payload"
    return
  fi
  if [[ "$got" != "$want" ]]; then
    echo "FAIL: $key expected $want got $got"
    fail=1
  else
    echo "OK: $key=$got"
  fi
}

check status ok
check db_ok True
check scrape_worker_ready True
check_if_present scrape_beat_enabled True
check_if_present market_coverage_feed_stale False

CELERY_RETRIES="${VERIFY_CELERY_RETRIES:-5}"
CELERY_RETRY_SLEEP="${VERIFY_CELERY_RETRY_SLEEP:-12}"
celery_json="{}"
worker_active="None"
celery_mode=""
celery_err=""
for attempt in $(seq 1 "$CELERY_RETRIES"); do
  celery_json=$(curl -fsS "${API%/}/api/v1/health/celery-status" 2>/dev/null || echo "{}")
  worker_active=$(echo "$celery_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('worker_active'))" 2>/dev/null || echo "None")
  celery_mode=$(echo "$celery_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('mode',''))" 2>/dev/null || echo "")
  celery_err=$(echo "$celery_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null || echo "")
  if [[ "$worker_active" == "True" ]]; then
    break
  fi
  if [[ "$attempt" -lt "$CELERY_RETRIES" ]]; then
    echo "WARN: celery worker_active=$worker_active mode=$celery_mode (attempt $attempt/$CELERY_RETRIES); retry in ${CELERY_RETRY_SLEEP}s…"
    sleep "$CELERY_RETRY_SLEEP"
  fi
done
echo "Celery status:"
echo "$celery_json" | python3 -m json.tool 2>/dev/null || echo "$celery_json"
celery_eager=$(echo "$celery_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('celery_task_always_eager'))" 2>/dev/null || echo "None")
if [[ "$celery_eager" != "False" ]]; then
  echo "FAIL: celery-status celery_task_always_eager=$celery_eager (expected False)"
  fail=1
else
  echo "OK: celery-status celery_task_always_eager=False"
fi
if [[ "$worker_active" != "True" ]]; then
  echo "FAIL: celery worker_active=$worker_active mode=$celery_mode error=$celery_err (after $CELERY_RETRIES attempts)"
  fail=1
else
  echo "OK: celery worker_active=True"
fi
if [[ "$celery_err" == *"6379}"* ]] || [[ "$celery_err" == *"6379}}"* ]]; then
  echo "HINT: malformed REDIS URL on API/worker — run: ./scripts/railway-fix-redis-broker.sh"
fi

fe_ok=0
for path in /status /api/public-health; do
  code=$(curl -fsS -o /dev/null -w "%{http_code}" "${FE%/}${path}" 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "OK: frontend ${path} HTTP 200"
    fe_ok=1
    break
  fi
  echo "WARN: frontend ${path} HTTP $code"
done
if [[ "$fe_ok" -ne 1 ]]; then
  echo "FAIL: frontend /status and /api/public-health both unreachable"
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "Prod gaps remain — run ./scripts/apply-prod-autonomous.sh or paste clipboard vars on Railway."
  exit 1
fi
echo "Prod health: all critical flags OK"
