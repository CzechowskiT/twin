#!/usr/bin/env bash
# P0 smoke: verify deployed API answers (see docs/P0_CHECKLIST.md, docs/INVESTOR_DEMO_P0.md).
# Usage:
#   BASE_URL=https://your-api.up.railway.app ./scripts/smoke-p0.sh
#   BASE_URL=... ./scripts/smoke-p0.sh --db
#   BASE_URL=... ./scripts/smoke-p0.sh --mvp
#   DEMO_BEARER_TOKEN=... BASE_URL=... ./scripts/smoke-p0.sh --jobs
# Combine flags in one run, e.g.:  BASE_URL=... ./scripts/smoke-p0.sh --db --mvp --jobs
set -euo pipefail

BASE_URL="${BASE_URL:-}"
if [[ -z "${BASE_URL}" ]]; then
  echo "Set BASE_URL to your public API root (no trailing slash), e.g. https://twin-api-xxxx.up.railway.app" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
HEALTH="${BASE_URL}/api/v1/health"

_run_health() {
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
}

_run_health_db() {
  echo "GET ${HEALTH}?db=true"
  code2="$(curl -sS -o /tmp/twin-health-db.json -w "%{http_code}" "${HEALTH}?db=true")"
  if [[ "${code2}" != "200" ]]; then
    echo "Expected HTTP 200 for db probe, got ${code2}" >&2
    cat /tmp/twin-health-db.json >&2 || true
    exit 1
  fi
  echo "health+db OK: $(tr -d '\n' </tmp/twin-health-db.json)"
}

_run_mvp_stats() {
  local mvp="${BASE_URL}/api/v1/public/mvp-stats"
  echo "GET ${mvp}"
  code3="$(curl -sS -o /tmp/twin-mvp.json -w "%{http_code}" "${mvp}")"
  if [[ "${code3}" != "200" ]]; then
    echo "Expected HTTP 200 for mvp-stats, got ${code3}" >&2
    cat /tmp/twin-mvp.json >&2 || true
    exit 1
  fi
  if ! python3 - <<'PY'
import json
from pathlib import Path

p = Path("/tmp/twin-mvp.json")
d = json.loads(p.read_text())
if "validated_jobs" not in d:
    raise SystemExit("missing validated_jobs")
print(f"mvp-stats OK: validated_jobs={d['validated_jobs']}")
PY
  then
    echo "mvp-stats: invalid JSON or missing validated_jobs" >&2
    cat /tmp/twin-mvp.json >&2 || true
    exit 1
  fi
}

_run_jobs_feed() {
  if [[ -z "${DEMO_BEARER_TOKEN:-}" ]]; then
    echo "Set DEMO_BEARER_TOKEN (JWT from a logged-in demo session) for --jobs" >&2
    exit 1
  fi
  local jobs="${BASE_URL}/api/v1/jobs/?limit=5&validated_only=true"
  echo "GET ${jobs} (authenticated)"
  code4="$(curl -sS -o /tmp/twin-jobs.json -w "%{http_code}" \
    -H "Authorization: Bearer ${DEMO_BEARER_TOKEN}" \
    "${jobs}")"
  if [[ "${code4}" != "200" ]]; then
    echo "Expected HTTP 200 for /jobs, got ${code4}" >&2
    cat /tmp/twin-jobs.json >&2 || true
    exit 1
  fi
  if ! python3 - <<'PY'
import json
from pathlib import Path

d = json.loads(Path("/tmp/twin-jobs.json").read_text())
total = int(d.get("total", 0))
if total < 1:
    raise SystemExit(
        "jobs feed empty (total=0). Run a scrape or import before investor demo — see docs/INVESTOR_DEMO_P0.md"
    )
print(f"jobs feed OK: total={total} (showing up to {len(d.get('items', []))} in page)")
PY
  then
    echo "jobs feed check failed" >&2
    cat /tmp/twin-jobs.json >&2 || true
    exit 1
  fi
}

if [[ $# -eq 0 ]]; then
  _run_health
  echo "P0 API smoke passed (health only). For investor demo add: --db --mvp and optionally --jobs"
  exit 0
fi

_run_health
for arg in "$@"; do
  case "${arg}" in
    --db) _run_health_db ;;
    --mvp) _run_mvp_stats ;;
    --jobs) _run_jobs_feed ;;
    *)
      echo "Unknown flag: ${arg} (use --db, --mvp, --jobs)" >&2
      exit 1
      ;;
  esac
done

echo "P0 API smoke passed (all requested checks)."
