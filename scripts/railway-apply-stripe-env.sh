#!/usr/bin/env bash
# Apply Stripe Checkout vars to the linked Railway API service (Stripe slice only).
# Requires: .env.railway with STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + STRIPE_PRICE_ID_PREMIUM
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"
# shellcheck source=/dev/null
source "$ROOT/scripts/load-env-railway.sh" "${RAILWAY_ENV_FILE:-.env.railway}"

ENV_FILE="${RAILWAY_ENV_FILE:-.env.railway}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.railway.example and fill STRIPE_* (see docs/STRIPE_RAILWAY_SETUP.md)." >&2
  exit 1
fi

CLI=(npx --yes @railway/cli@4)

if ! "${CLI[@]}" whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx @railway/cli login OR set RAILWAY_TOKEN in $ENV_FILE" >&2
  exit 1
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "STRIPE_SECRET_KEY is empty in $ENV_FILE — run scripts/stripe-bootstrap-test.py first." >&2
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

set_var STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-}"
set_var STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET:-}"
set_var STRIPE_PRICE_ID_PREMIUM "${STRIPE_PRICE_ID_PREMIUM:-}"
set_var STRIPE_PRICE_ID_PRO "${STRIPE_PRICE_ID_PRO:-}"
set_var STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES "${STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES:-card,link}"

echo "Redeploying API service…"
"${CLI[@]}" redeploy --yes

API_URL="${RAILWAY_API_URL:-https://twin-production-bcd9.up.railway.app}"
echo "Done. Verify:"
echo "  curl -sS \"$API_URL/api/v1/health?ops=1\" | jq .stripe_checkout_ready"
echo "  curl -sS \"$API_URL/api/v1/public/mvp-stats\" | jq '{stripe_checkout_ready, paid_subscribers, subscription_mrr_usd}'"
