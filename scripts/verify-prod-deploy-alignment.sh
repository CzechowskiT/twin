#!/usr/bin/env bash
# Verify each production component against the commit that actually affects it.
set -euo pipefail

EXPECTED_SHA="${1:-${GITHUB_SHA:-}}"
API_HEALTH="${API_HEALTH:-https://twin-production-bcd9.up.railway.app/api/v1/health}"
FRONTEND_HEALTH="${FRONTEND_HEALTH:-https://twin-sooty.vercel.app/api/public-health}"
DISPATCHER_HEALTH="${DISPATCHER_HEALTH:-https://twin-production-bcd9.up.railway.app/api/internal/agent-dispatch/health}"
ALIGNMENT_ATTEMPTS="${ALIGNMENT_ATTEMPTS:-60}"
ALIGNMENT_SLEEP_SECONDS="${ALIGNMENT_SLEEP_SECONDS:-15}"

if [[ -z "$EXPECTED_SHA" ]]; then
  echo "Expected repository SHA is required"
  exit 2
fi

component_unchanged() {
  local deployed_sha="$1"
  local component="$2"
  git cat-file -e "${deployed_sha}^{commit}" 2>/dev/null || return 1
  git merge-base --is-ancestor "$deployed_sha" "$EXPECTED_SHA" || return 1
  if [[ "$component" == "api" ]]; then
    git diff --quiet "${deployed_sha}..${EXPECTED_SHA}" -- \
      backend/ deploy/ .env.railway.example
    return
  fi
  git diff --quiet "${deployed_sha}..${EXPECTED_SHA}" -- frontend/
}

read_health_field() {
  local url="$1"
  local field="$2"
  curl -fsS --max-time 15 "$url" |
    FIELD="$field" python3 -c \
      'import json,os,sys; print(json.load(sys.stdin).get(os.environ["FIELD"], ""))'
}

wait_for_component() {
  local label="$1"
  local component="$2"
  local url="$3"
  local field="$4"
  local deployed=""
  for attempt in $(seq 1 "$ALIGNMENT_ATTEMPTS"); do
    if deployed=$(read_health_field "$url" "$field"); then
      if [[ "$deployed" == "$EXPECTED_SHA" ]]; then
        echo "$label production SHA verified: ${deployed:0:12}"
        return 0
      fi
      if component_unchanged "$deployed" "$component"; then
        echo "$label component aligned at ${deployed:0:12}; no $component changes through ${EXPECTED_SHA:0:12}"
        return 0
      fi
    fi
    echo "$label deployment pending ($attempt/$ALIGNMENT_ATTEMPTS)"
    if [[ "$attempt" -lt "$ALIGNMENT_ATTEMPTS" ]]; then
      sleep "$ALIGNMENT_SLEEP_SECONDS"
    fi
  done
  echo "$label is not aligned with ${EXPECTED_SHA:0:12}"
  return 1
}

wait_for_component "API" "api" "$API_HEALTH" "git_commit"
wait_for_component "Frontend" "frontend" "$FRONTEND_HEALTH" "frontend_commit"

canary=$(read_health_field "$DISPATCHER_HEALTH" "artifact_gate_canary")
CANARY="$canary" python3 -c \
  'import ast,os; c=ast.literal_eval(os.environ["CANARY"]); assert c["status"] == "PASS" and c.get("reason_code") is None'
echo "Dispatcher artifact gate canary verified"
