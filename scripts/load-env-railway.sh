#!/usr/bin/env bash
# Load .env.railway without bash interpreting Railway reference syntax (${{Redis...}}).
set -euo pipefail

ENV_FILE="${1:-}"

read_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//' || true
}

if [[ -z "$ENV_FILE" || ! -f "$ENV_FILE" ]]; then
  return 0
fi

export RAILWAY_API_URL="$(read_env RAILWAY_API_URL)"
export API_URL="$(read_env API_URL)"
export FRONTEND_URL="$(read_env FRONTEND_URL)"
export CORS_ORIGINS="$(read_env CORS_ORIGINS)"
export ENVIRONMENT="$(read_env ENVIRONMENT)"
export SECRET_KEY="$(read_env SECRET_KEY)"
export RESEND_API_KEY="$(read_env RESEND_API_KEY)"
export MAIL_FROM="$(read_env MAIL_FROM)"
export GOOGLE_CLIENT_ID="$(read_env GOOGLE_CLIENT_ID)"
export GOOGLE_CLIENT_SECRET="$(read_env GOOGLE_CLIENT_SECRET)"
export GOOGLE_REDIRECT_URI="$(read_env GOOGLE_REDIRECT_URI)"
export GOOGLE_CALENDAR_REDIRECT_URI="$(read_env GOOGLE_CALENDAR_REDIRECT_URI)"
export GITHUB_CLIENT_ID="$(read_env GITHUB_CLIENT_ID)"
export GITHUB_CLIENT_SECRET="$(read_env GITHUB_CLIENT_SECRET)"
export GITHUB_REDIRECT_URI="$(read_env GITHUB_REDIRECT_URI)"
export APPLE_CLIENT_ID="$(read_env APPLE_CLIENT_ID)"
export APPLE_TEAM_ID="$(read_env APPLE_TEAM_ID)"
export APPLE_KEY_ID="$(read_env APPLE_KEY_ID)"
export APPLE_PRIVATE_KEY="$(read_env APPLE_PRIVATE_KEY)"
export APPLE_REDIRECT_URI="$(read_env APPLE_REDIRECT_URI)"
export MICROSOFT_CLIENT_ID="$(read_env MICROSOFT_CLIENT_ID)"
export MICROSOFT_CLIENT_SECRET="$(read_env MICROSOFT_CLIENT_SECRET)"
export MICROSOFT_REDIRECT_URI="$(read_env MICROSOFT_REDIRECT_URI)"
export MICROSOFT_CALENDAR_REDIRECT_URI="$(read_env MICROSOFT_CALENDAR_REDIRECT_URI)"
export MICROSOFT_TENANT="$(read_env MICROSOFT_TENANT)"
export CELERY_BROKER_URL="$(read_env CELERY_BROKER_URL)"
export CELERY_RESULT_BACKEND="$(read_env CELERY_RESULT_BACKEND)"
export REDIS_URL="$(read_env REDIS_URL)"
export CELERY_TASK_ALWAYS_EAGER="$(read_env CELERY_TASK_ALWAYS_EAGER)"
export SCRAPE_WORKER_READY="$(read_env SCRAPE_WORKER_READY)"
export SCRAPE_BEAT_ENABLED="$(read_env SCRAPE_BEAT_ENABLED)"
export AUTO_APPLY_HEADLESS="$(read_env AUTO_APPLY_HEADLESS)"
export LINKEDIN_CLIENT_ID="$(read_env LINKEDIN_CLIENT_ID)"
export LINKEDIN_CLIENT_SECRET="$(read_env LINKEDIN_CLIENT_SECRET)"
export LINKEDIN_REDIRECT_URI="$(read_env LINKEDIN_REDIRECT_URI)"
export STRIPE_SECRET_KEY="$(read_env STRIPE_SECRET_KEY)"
export STRIPE_WEBHOOK_SECRET="$(read_env STRIPE_WEBHOOK_SECRET)"
export STRIPE_PRICE_ID_PREMIUM="$(read_env STRIPE_PRICE_ID_PREMIUM)"
export STRIPE_PRICE_ID_PRO="$(read_env STRIPE_PRICE_ID_PRO)"
export OPS_ADMIN_TOKEN="$(read_env OPS_ADMIN_TOKEN)"
export BETA_ADMIN_TOKEN="$(read_env BETA_ADMIN_TOKEN)"
export RECRUITER_INBOX_TOKEN="$(read_env RECRUITER_INBOX_TOKEN)"
export PARTNER_EXPORT_TOKEN="$(read_env PARTNER_EXPORT_TOKEN)"
