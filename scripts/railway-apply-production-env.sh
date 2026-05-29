#!/usr/bin/env bash
# Apply production env vars to the linked Railway API service (requires `railway login` + `railway link`).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-redis-ref.sh"

ENV_FILE="${RAILWAY_ENV_FILE:-.env.railway}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.railway.example and fill secrets." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/scripts/load-env-railway.sh" "$ENV_FILE"

API_URL="${RAILWAY_API_URL:-}"
if [[ -z "$API_URL" ]]; then
  echo "Set RAILWAY_API_URL in $ENV_FILE (e.g. https://twin-production-bcd9.up.railway.app)" >&2
  exit 1
fi

CLI=(npx --yes @railway/cli@4)

if ! "${CLI[@]}" whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx @railway/cli login OR set RAILWAY_TOKEN in .env.railway" >&2
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

set_var API_URL "${API_URL:-${RAILWAY_API_URL:-}}"
set_var FRONTEND_URL "${FRONTEND_URL:-https://twin-sooty.vercel.app}"
set_var CORS_ORIGINS "${CORS_ORIGINS:-https://twin-sooty.vercel.app}"
set_var ENVIRONMENT "${ENVIRONMENT:-production}"
set_var SECRET_KEY "${SECRET_KEY:-}"

set_var RESEND_API_KEY "${RESEND_API_KEY:-}"
set_var MAIL_FROM "${MAIL_FROM:-}"
set_var SMTP_HOST "${SMTP_HOST:-}"
set_var SMTP_PORT "${SMTP_PORT:-587}"
set_var SMTP_USER "${SMTP_USER:-}"
set_var SMTP_PASSWORD "${SMTP_PASSWORD:-}"
set_var SMTP_FROM "${SMTP_FROM:-}"

MS_AUTH_REDIRECT="${MICROSOFT_REDIRECT_URI:-$API_URL/api/v1/auth/microsoft/callback}"
MS_CAL_REDIRECT="${MICROSOFT_CALENDAR_REDIRECT_URI:-$API_URL/api/v1/calendar/microsoft/callback}"
set_var MICROSOFT_CLIENT_ID "${MICROSOFT_CLIENT_ID:-}"
set_var MICROSOFT_CLIENT_SECRET "${MICROSOFT_CLIENT_SECRET:-}"
set_var MICROSOFT_REDIRECT_URI "$MS_AUTH_REDIRECT"
set_var MICROSOFT_CALENDAR_REDIRECT_URI "$MS_CAL_REDIRECT"
set_var MICROSOFT_TENANT "${MICROSOFT_TENANT:-common}"

GCAL_REDIRECT="${GOOGLE_CALENDAR_REDIRECT_URI:-$API_URL/api/v1/calendar/google/callback}"
GOOGLE_AUTH_REDIRECT="${GOOGLE_REDIRECT_URI:-$API_URL/api/v1/auth/google/callback}"
set_var GOOGLE_CLIENT_ID "${GOOGLE_CLIENT_ID:-}"
set_var GOOGLE_CLIENT_SECRET "${GOOGLE_CLIENT_SECRET:-}"
set_var GOOGLE_REDIRECT_URI "$GOOGLE_AUTH_REDIRECT"
set_var GOOGLE_CALENDAR_REDIRECT_URI "$GCAL_REDIRECT"

GITHUB_AUTH_REDIRECT="${GITHUB_REDIRECT_URI:-$API_URL/api/v1/auth/github/callback}"
set_var GITHUB_CLIENT_ID "${GITHUB_CLIENT_ID:-}"
set_var GITHUB_CLIENT_SECRET "${GITHUB_CLIENT_SECRET:-}"
set_var GITHUB_REDIRECT_URI "$GITHUB_AUTH_REDIRECT"

APPLE_AUTH_REDIRECT="${APPLE_REDIRECT_URI:-$API_URL/api/v1/auth/apple/callback}"
set_var APPLE_CLIENT_ID "${APPLE_CLIENT_ID:-}"
set_var APPLE_TEAM_ID "${APPLE_TEAM_ID:-}"
set_var APPLE_KEY_ID "${APPLE_KEY_ID:-}"
set_var APPLE_PRIVATE_KEY "${APPLE_PRIVATE_KEY:-}"
set_var APPLE_REDIRECT_URI "$APPLE_AUTH_REDIRECT"

# Celery + scrape worker (Redis plugin must exist; worker service uses deploy/railway-worker.toml --beat)
REDIS_REF="$(sanitize_redis_broker_ref "${CELERY_BROKER_URL:-}")"
if [[ "$REDIS_REF" != "${CELERY_BROKER_URL:-}" ]] && [[ -n "${CELERY_BROKER_URL:-}" ]]; then
  echo "WARN: CELERY_BROKER_URL in $ENV_FILE sanitized → Railway reference" >&2
fi
set_var CELERY_BROKER_URL "$REDIS_REF"
set_var CELERY_RESULT_BACKEND "${CELERY_RESULT_BACKEND:-$REDIS_REF}"
set_var REDIS_URL "${REDIS_URL:-$REDIS_REF}"
set_var CELERY_TASK_ALWAYS_EAGER "${CELERY_TASK_ALWAYS_EAGER:-false}"
set_var SCRAPE_WORKER_READY "${SCRAPE_WORKER_READY:-true}"
set_var SCRAPE_BEAT_ENABLED "${SCRAPE_BEAT_ENABLED:-true}"
set_var AUTO_APPLY_HEADLESS "${AUTO_APPLY_HEADLESS:-true}"

# LinkedIn OAuth (Sign in with LinkedIn — callback on API, not frontend)
LI_REDIRECT="${LINKEDIN_REDIRECT_URI:-$API_URL/api/v1/auth/linkedin/callback}"
set_var LINKEDIN_CLIENT_ID "${LINKEDIN_CLIENT_ID:-}"
set_var LINKEDIN_CLIENT_SECRET "${LINKEDIN_CLIENT_SECRET:-}"
set_var LINKEDIN_REDIRECT_URI "$LI_REDIRECT"

# Stripe Checkout (run scripts/stripe-bootstrap-test.py first to create price + webhook in test mode)
set_var STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-}"
set_var STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET:-}"
set_var STRIPE_PRICE_ID_STANDBY "${STRIPE_PRICE_ID_STANDBY:-}"
set_var STRIPE_PRICE_ID_STANDARD "${STRIPE_PRICE_ID_STANDARD:-}"
set_var STRIPE_PRICE_STANDBY "${STRIPE_PRICE_STANDBY:-${STRIPE_PRICE_ID_STANDBY:-}}"
set_var STRIPE_PRICE_STANDARD "${STRIPE_PRICE_STANDARD:-${STRIPE_PRICE_ID_STANDARD:-}}"
set_var STRIPE_PRICE_ID_PREMIUM "${STRIPE_PRICE_ID_PREMIUM:-}"
set_var STRIPE_PRICE_ID_PRO "${STRIPE_PRICE_ID_PRO:-}"

set_var DEMO_MODE_ENABLED "${DEMO_MODE_ENABLED:-true}"
set_var DEMO_USER_EMAIL "${DEMO_USER_EMAIL:-demo@twin.career}"

# Investor data room + auto-apply blobs (S3-compatible: AWS S3, Cloudflare R2, MinIO)
set_var S3_BUCKET_NAME "${S3_BUCKET_NAME:-}"
set_var S3_ACCESS_KEY_ID "${S3_ACCESS_KEY_ID:-}"
set_var S3_SECRET_ACCESS_KEY "${S3_SECRET_ACCESS_KEY:-}"
set_var S3_ENDPOINT_URL "${S3_ENDPOINT_URL:-}"
set_var S3_REGION "${S3_REGION:-auto}"
if [[ -n "${S3_BUCKET_NAME:-}" && -n "${S3_ACCESS_KEY_ID:-}" && -n "${S3_SECRET_ACCESS_KEY:-}" ]]; then
  set_var DATA_ROOM_LOCAL_UPLOAD_ENABLED "false"
else
  set_var DATA_ROOM_LOCAL_UPLOAD_ENABLED "${DATA_ROOM_LOCAL_UPLOAD_ENABLED:-true}"
fi

set_var OPS_ADMIN_TOKEN "${OPS_ADMIN_TOKEN:-}"
set_var BETA_ADMIN_TOKEN "${BETA_ADMIN_TOKEN:-${OPS_ADMIN_TOKEN:-}}"
set_var RECRUITER_INBOX_TOKEN "${RECRUITER_INBOX_TOKEN:-}"
set_var PARTNER_EXPORT_TOKEN "${PARTNER_EXPORT_TOKEN:-}"

echo "Redeploying API service…"
"${CLI[@]}" redeploy --yes

echo "Done. Verify:"
echo "  curl -sS \"$API_URL/api/v1/health?ops=1\" | jq ."
echo "Expect scrape_worker_ready, stripe_checkout_ready when Stripe vars are set."
