#!/usr/bin/env bash
# Verify nightly auto-apply observability on production (auto_apply_runs + last-sweep).
# Manual /api/v1/auto-apply/trigger updates consent.last_run_at but does NOT insert auto_apply_runs;
# platform sweeps (Celery beat 02:00 Warsaw) do. Use trigger-sweep or wait for beat to populate runs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"

API_URL="${API_URL:-https://twin-production-bcd9.up.railway.app}"
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

for k in API_URL OPS_ADMIN_TOKEN SECRET_KEY; do
  load_env_key "$k" || true
done

echo "== celery / beat =="
curl -sS -m 20 "${API_URL}/api/v1/health/celery-status" | python3 -m json.tool

echo "== authenticated last-sweep (needs JWT) =="
if [[ -n "${VERIFY_JWT:-}" ]]; then
  curl -sS -m 20 "${API_URL}/api/v1/auto-apply/last-sweep" \
    -H "Authorization: Bearer ${VERIFY_JWT}" | python3 -m json.tool
else
  echo "(skip — set VERIFY_JWT or run after ./scripts/trigger-founder-auto-apply.sh exports token)"
fi

echo "== ops auto_apply_runs (latest platform sweep) =="
if [[ -n "${OPS_ADMIN_TOKEN:-}" ]]; then
  OPS_TOKEN="${OPS_ADMIN_TOKEN}"
  curl -sS -m 20 "${API_URL}/api/v1/ops/auto-apply/last-run" \
    -H "Authorization: Bearer ${OPS_TOKEN}" | python3 -m json.tool
else
  echo "(skip — set OPS_ADMIN_TOKEN from Railway twin service env)"
fi

python3 <<'PY'
import json, os, sys, urllib.request

api = os.environ.get("API_URL", "https://twin-production-bcd9.up.railway.app").rstrip("/")
ops = os.environ.get("OPS_ADMIN_TOKEN", "").strip()
if not ops:
    print("NOTE: auto_apply_runs row appears after Celery nightly sweep, not after manual trigger.")
    sys.exit(0)

req = urllib.request.Request(
    f"{api}/api/v1/ops/auto-apply/last-run",
    headers={"Authorization": f"Bearer {ops}"},
)
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = json.load(resp)
except Exception as exc:
    print(f"WARN: could not fetch last run: {exc}", file=sys.stderr)
    sys.exit(0)

if not body:
    print("WARN: no auto_apply_runs row yet — wait for 02:00 Europe/Warsaw beat or POST /auto-apply/trigger-sweep")
    sys.exit(0)

started = body.get("started_at")
submitted = int(body.get("total_applications_submitted") or 0)
print(f"OK: latest sweep started_at={started} submitted={submitted}")
PY
