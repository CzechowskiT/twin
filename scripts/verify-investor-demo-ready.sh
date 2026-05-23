#!/usr/bin/env bash
# Post-seed smoke: demo snapshot live_db + mvp-stats + API health.
# Exit 0 when demo_user_configured and source=live_db (or mvp-stats show seed data).
set -euo pipefail

API="${VERIFY_PROD_API:-https://twin-production-bcd9.up.railway.app}"
API="${API%/}"

fail=0
missing=()

echo "== Investor demo readiness =="
echo "API: $API"
echo

health_json=$(curl -fsS "${API}/api/v1/health" 2>/dev/null || echo "{}")
health_status=$(echo "$health_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
git_commit=$(echo "$health_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('git_commit',''))" 2>/dev/null || echo "")
if [[ "$health_status" == "ok" ]]; then
  echo "OK: health status=ok git_commit=${git_commit:-unknown}"
else
  echo "FAIL: health status=$health_status"
  missing+=("API health not ok")
  fail=1
fi

snapshot_json=$(curl -fsS "${API}/api/v1/demo/snapshot" 2>/dev/null || echo "{}")
snapshot_source=$(echo "$snapshot_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('source',''))" 2>/dev/null || echo "")
demo_configured=$(echo "$snapshot_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('demo_user_configured', False))" 2>/dev/null || echo "False")
demo_mode=$(echo "$snapshot_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('demo_mode', False))" 2>/dev/null || echo "False")

echo "Snapshot: source=$snapshot_source demo_user_configured=$demo_configured demo_mode=$demo_mode"

if [[ "$demo_mode" != "True" ]]; then
  missing+=("DEMO_MODE_ENABLED not true on API (snapshot demo_mode=$demo_mode)")
  fail=1
fi

if [[ "$demo_configured" != "True" ]]; then
  missing+=("DEMO_USER_EMAIL not set or demo user missing — set demo@twin.career on Railway API")
  fail=1
fi

if [[ "$snapshot_source" != "live_db" ]]; then
  missing+=("snapshot source=$snapshot_source (expected live_db — run seed-investor-demo.py)")
  fail=1
else
  echo "OK: snapshot source=live_db"
fi

stats_json=$(curl -fsS "${API}/api/v1/public/mvp-stats" 2>/dev/null || echo "{}")
apps=$(echo "$stats_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_applications',0))" 2>/dev/null || echo "0")
interviews=$(echo "$stats_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('interviews_scheduled',0))" 2>/dev/null || echo "0")
jobs=$(echo "$stats_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('validated_jobs',0))" 2>/dev/null || echo "0")
users=$(echo "$stats_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('registered_users',0))" 2>/dev/null || echo "0")

echo "mvp-stats: validated_jobs=$jobs registered_users=$users total_applications=$apps interviews_scheduled=$interviews"

if [[ "${apps:-0}" -lt 1 ]]; then
  missing+=("mvp-stats.total_applications=$apps (expected >= 1 after seed)")
  fail=1
fi
if [[ "${interviews:-0}" -lt 1 ]]; then
  missing+=("mvp-stats.interviews_scheduled=$interviews (expected >= 1 after seed)")
  fail=1
fi

echo
if [[ "$fail" -ne 0 ]]; then
  echo "NOT READY — fix before logged-in demo:"
  for item in "${missing[@]}"; do
    echo "  - $item"
  done
  echo
  echo "User step: export DEMO_USER_PASSWORD='…' && railway run python3 scripts/seed-investor-demo.py --reset-password --print-credentials"
  exit 1
fi

echo "READY: live_db snapshot + seeded pipeline metrics"
exit 0
