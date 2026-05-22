#!/usr/bin/env bash
# Apply production env to the Railway Celery worker service (same secrets as API, no public URL).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-redis-ref.sh"

ENV_FILE="${RAILWAY_ENV_FILE:-.env.railway}"
# Default matches Railway service name in project responsible-success (override if renamed).
WORKER_SERVICE="${RAILWAY_WORKER_SERVICE:-enthusiastic-encouragement}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.railway.example and fill secrets." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/scripts/load-env-railway.sh" "$ENV_FILE"

CLI=(npx --yes @railway/cli@4)

if ! "${CLI[@]}" whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx @railway/cli login && npx @railway/cli link" >&2
  exit 1
fi

set_var() {
  local name="$1"
  local value="$2"
  if [[ -z "${value// }" ]]; then
    echo "Skip $name (empty)"
    return 0
  fi
  echo "Set $name on $WORKER_SERVICE"
  "${CLI[@]}" variables set "$name=$value" --service "$WORKER_SERVICE" --skip-deploys
}

REDIS_REF="$(sanitize_redis_broker_ref "${CELERY_BROKER_URL:-}")"

set_var DATABASE_URL "${DATABASE_URL:-\${{Postgres.DATABASE_URL}}}"
set_var CELERY_BROKER_URL "$REDIS_REF"
set_var CELERY_RESULT_BACKEND "${CELERY_RESULT_BACKEND:-$REDIS_REF}"
set_var REDIS_URL "${REDIS_URL:-$REDIS_REF}"
set_var SECRET_KEY "${SECRET_KEY:-}"
set_var ENVIRONMENT "${ENVIRONMENT:-production}"
set_var ANTHROPIC_API_KEY "${ANTHROPIC_API_KEY:-}"
set_var CELERY_TASK_ALWAYS_EAGER "${CELERY_TASK_ALWAYS_EAGER:-false}"
set_var SCRAPE_WORKER_READY "${SCRAPE_WORKER_READY:-true}"
set_var SCRAPE_BEAT_ENABLED "${SCRAPE_BEAT_ENABLED:-true}"
set_var AUTO_APPLY_HEADLESS "${AUTO_APPLY_HEADLESS:-true}"
set_var PLACEMENT_RETENTION_BEAT_ENABLED "${PLACEMENT_RETENTION_BEAT_ENABLED:-true}"

set_var RESEND_API_KEY "${RESEND_API_KEY:-}"
set_var MAIL_FROM "${MAIL_FROM:-}"
set_var SMTP_HOST "${SMTP_HOST:-}"
set_var SMTP_PORT "${SMTP_PORT:-587}"
set_var SMTP_USER "${SMTP_USER:-}"
set_var SMTP_PASSWORD "${SMTP_PASSWORD:-}"
set_var SMTP_FROM "${SMTP_FROM:-}"

echo "Redeploying worker service $WORKER_SERVICE..."
"${CLI[@]}" redeploy --service "$WORKER_SERVICE" --yes

echo "Done. Logs: railway logs --service $WORKER_SERVICE"
echo "API should have SCRAPE_WORKER_READY=true and CELERY_TASK_ALWAYS_EAGER=false."
