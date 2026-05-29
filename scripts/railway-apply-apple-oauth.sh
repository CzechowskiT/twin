#!/usr/bin/env bash
# Apply Apple Sign In credentials to Railway (production API).
# Prerequisite: Apple Developer → Services ID + .p8 key (see docs/APPLE_LOGIN_FOUNDER_PL.md).
#
# Usage (do not commit secrets):
#   APPLE_CLIENT_ID='pl.career.twin.web' \
#   APPLE_TEAM_ID='AB12CD34EF' \
#   APPLE_KEY_ID='XYZ1234567' \
#   APPLE_PRIVATE_KEY="$(cat AuthKey_XYZ.p8)" \
#   ./scripts/railway-apply-apple-oauth.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"

API_URL="${RAILWAY_API_URL:-https://twin-production-bcd9.up.railway.app}"
CLIENT_ID="${APPLE_CLIENT_ID:-}"
TEAM_ID="${APPLE_TEAM_ID:-}"
KEY_ID="${APPLE_KEY_ID:-}"
PRIVATE_KEY="${APPLE_PRIVATE_KEY:-}"
REDIRECT_URI="${APPLE_REDIRECT_URI:-$API_URL/api/v1/auth/apple/callback}"

for name in CLIENT_ID TEAM_ID KEY_ID PRIVATE_KEY; do
  eval "val=\${APPLE_${name}:-}"
  if [[ -z "${val// }" ]]; then
    echo "Missing APPLE_${name} (see docs/APPLE_LOGIN_FOUNDER_PL.md)." >&2
    exit 1
  fi
done

CLI=(npx --yes @railway/cli@4)
if ! "${CLI[@]}" whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx @railway/cli login OR set RAILWAY_TOKEN in .env.railway" >&2
  exit 1
fi

echo "Setting Apple Sign In variables on Railway…"
"${CLI[@]}" variables set \
  "APPLE_CLIENT_ID=$CLIENT_ID" \
  "APPLE_TEAM_ID=$TEAM_ID" \
  "APPLE_KEY_ID=$KEY_ID" \
  "APPLE_PRIVATE_KEY=$PRIVATE_KEY" \
  "APPLE_REDIRECT_URI=$REDIRECT_URI"

echo "Triggering API redeploy…"
"${CLI[@]}" redeploy --yes 2>/dev/null || "${CLI[@]}" up --detach 2>/dev/null || echo "Redeploy manually in Railway dashboard."

echo "Verify:"
echo "  curl -s '$API_URL/api/v1/health?ops=1' | grep apple_oauth"
