#!/usr/bin/env bash
# Fix Celery broker: use resolved redis:// URL (not ${{Redis...}} — avoids 6379}} parse errors).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"

CLI=(npx --yes @railway/cli@4)

if ! "${CLI[@]}" whoami >/dev/null 2>&1; then
  echo "Railway CLI not authenticated. Set RAILWAY_TOKEN in .env.railway" >&2
  exit 1
fi

"${CLI[@]}" link -p responsible-success -e production -s twin 2>/dev/null || true

read_var() {
  local svc="$1" key="$2"
  local line
  line=$("${CLI[@]}" variables --service "$svc" -k 2>/dev/null | grep -E "^${key}=" | head -1 || true)
  echo "${line#*=}"
}

REF="$(read_var twin CELERY_BROKER_URL)"
if [[ -z "$REF" || "$REF" != redis://* ]]; then
  REF="$(read_var twin REDIS_URL)"
fi
if [[ -z "$REF" || "$REF" != redis://* ]]; then
  echo "Could not read resolved redis URL from Railway (twin service)." >&2
  echo "Set CELERY_BROKER_URL manually in Railway UI to your Redis plugin URL." >&2
  exit 1
fi
# Strip accidental template suffixes from bad pastes.
REF="${REF%%\}\}}"
REF="${REF%%\}}"

echo "Using broker URL: ${REF%%:*}://***@${REF#*@}"

for svc in twin enthusiastic-encouragement; do
  echo "Set Redis URLs on $svc …"
  "${CLI[@]}" variables set "CELERY_BROKER_URL=$REF" --service "$svc" --skip-deploys
  "${CLI[@]}" variables set "CELERY_RESULT_BACKEND=$REF" --service "$svc" --skip-deploys
  "${CLI[@]}" variables set "REDIS_URL=$REF" --service "$svc" --skip-deploys
  "${CLI[@]}" variables set "CELERY_TASK_ALWAYS_EAGER=false" --service "$svc" --skip-deploys
done

echo "Redeploy API (twin)…"
"${CLI[@]}" redeploy --service twin --yes
echo "Redeploy worker (enthusiastic-encouragement)…"
"${CLI[@]}" redeploy --service enthusiastic-encouragement --yes
echo "Done. Wait ~90s then: ./scripts/verify-prod-health.sh"
