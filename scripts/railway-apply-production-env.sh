#!/usr/bin/env bash
# Apply production env vars to the linked Railway API service (requires `railway login` + `railway link`).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${RAILWAY_ENV_FILE:-.env.railway}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.railway.example and fill secrets." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

API_URL="${RAILWAY_API_URL:-}"
if [[ -z "$API_URL" ]]; then
  echo "Set RAILWAY_API_URL in $ENV_FILE (e.g. https://twin-production-bcd9.up.railway.app)" >&2
  exit 1
fi

CLI=(npx --yes @railway/cli@4)

if ! "${CLI[@]}" whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx @railway/cli login" >&2
  exit 1
fi

set_var() {
  local name="$1"
  local value="$2"
  if [[ -z "${value// }" ]]; then
    echo "Skip $name (empty)"
    return 0
  fi
  echo "Set $name"
  "${CLI[@]}" variables set "$name=$value" --skip-deploys
}

set_var API_URL "$API_URL"
set_var FRONTEND_URL "${FRONTEND_URL:-https://twin-sooty.vercel.app}"
set_var CORS_ORIGINS "${CORS_ORIGINS:-https://twin-sooty.vercel.app}"

set_var RESEND_API_KEY "${RESEND_API_KEY:-}"
set_var MAIL_FROM "${MAIL_FROM:-}"
set_var SMTP_HOST "${SMTP_HOST:-}"
set_var SMTP_PORT "${SMTP_PORT:-587}"
set_var SMTP_USER "${SMTP_USER:-}"
set_var SMTP_PASSWORD "${SMTP_PASSWORD:-}"
set_var SMTP_FROM "${SMTP_FROM:-}"

MS_REDIRECT="${MICROSOFT_CALENDAR_REDIRECT_URI:-$API_URL/api/v1/calendar/microsoft/callback}"
set_var MICROSOFT_CLIENT_ID "${MICROSOFT_CLIENT_ID:-}"
set_var MICROSOFT_CLIENT_SECRET "${MICROSOFT_CLIENT_SECRET:-}"
set_var MICROSOFT_CALENDAR_REDIRECT_URI "$MS_REDIRECT"
set_var MICROSOFT_TENANT "${MICROSOFT_TENANT:-common}"

GCAL_REDIRECT="${GOOGLE_CALENDAR_REDIRECT_URI:-$API_URL/api/v1/calendar/google/callback}"
set_var GOOGLE_CLIENT_ID "${GOOGLE_CLIENT_ID:-}"
set_var GOOGLE_CLIENT_SECRET "${GOOGLE_CLIENT_SECRET:-}"
set_var GOOGLE_CALENDAR_REDIRECT_URI "$GCAL_REDIRECT"

# Celery + scrape worker (Redis plugin must exist; worker service uses deploy/railway-worker.toml --beat)
REDIS_REF="${CELERY_BROKER_URL:-\${{Redis.REDIS_URL}}}"
set_var CELERY_BROKER_URL "$REDIS_REF"
set_var CELERY_RESULT_BACKEND "${CELERY_RESULT_BACKEND:-$REDIS_REF}"
set_var REDIS_URL "${REDIS_URL:-$REDIS_REF}"
set_var CELERY_TASK_ALWAYS_EAGER "${CELERY_TASK_ALWAYS_EAGER:-false}"
set_var SCRAPE_WORKER_READY "${SCRAPE_WORKER_READY:-true}"
set_var SCRAPE_BEAT_ENABLED "${SCRAPE_BEAT_ENABLED:-true}"
set_var AUTO_APPLY_HEADLESS "${AUTO_APPLY_HEADLESS:-true}"

# Stripe Checkout (run scripts/stripe-bootstrap-test.py first to create price + webhook in test mode)
set_var STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-}"
set_var STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET:-}"
set_var STRIPE_PRICE_ID_PREMIUM "${STRIPE_PRICE_ID_PREMIUM:-}"
set_var STRIPE_PRICE_ID_PRO "${STRIPE_PRICE_ID_PRO:-}"

set_var OPS_ADMIN_TOKEN "${OPS_ADMIN_TOKEN:-}"
set_var BETA_ADMIN_TOKEN "${BETA_ADMIN_TOKEN:-${OPS_ADMIN_TOKEN:-}}"
set_var RECRUITER_INBOX_TOKEN "${RECRUITER_INBOX_TOKEN:-}"
set_var PARTNER_EXPORT_TOKEN "${PARTNER_EXPORT_TOKEN:-}"

echo "Redeploying API service…"
"${CLI[@]}" redeploy --yes

echo "Done. Verify:"
echo "  curl -sS \"$API_URL/api/v1/health?ops=1\" | jq ."
echo "Expect scrape_worker_ready, stripe_checkout_ready when Stripe vars are set."
