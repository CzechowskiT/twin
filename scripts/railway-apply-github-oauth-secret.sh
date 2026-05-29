#!/usr/bin/env bash
# Apply GitHub OAuth client secret to Railway (production API).
# Prerequisite: TWIN Production API OAuth app
# https://github.com/settings/applications/3619797
# Callback: https://twin-production-bcd9.up.railway.app/api/v1/auth/github/callback
# → Generate a new client secret (GitHub may require email verification).
#
# Usage (do not commit the secret):
#   GITHUB_CLIENT_SECRET='ghs_…' ./scripts/railway-apply-github-oauth-secret.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"

CLIENT_ID="${GITHUB_CLIENT_ID:-}"
SECRET="${GITHUB_CLIENT_SECRET:-}"

if [[ -z "${CLIENT_ID// }" ]]; then
  echo "Set GITHUB_CLIENT_ID (OAuth App → Client ID)." >&2
  exit 1
fi
if [[ -z "${SECRET// }" ]]; then
  echo "Set GITHUB_CLIENT_SECRET (OAuth App → Generate a new client secret)." >&2
  exit 1
fi

CLI=(npx --yes @railway/cli@4)
if ! "${CLI[@]}" whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: npx @railway/cli login OR set RAILWAY_TOKEN in .env.railway" >&2
  exit 1
fi

echo "Setting GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET on Railway…"
"${CLI[@]}" variables set \
  "GITHUB_CLIENT_ID=$CLIENT_ID" \
  "GITHUB_CLIENT_SECRET=$SECRET"

echo "Triggering API redeploy…"
"${CLI[@]}" redeploy --yes 2>/dev/null || "${CLI[@]}" up --detach 2>/dev/null || echo "Redeploy manually in Railway dashboard."

echo "Verify:"
echo "  curl -s 'https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1' | grep github_oauth"
echo "  curl -sI 'https://twin-production-bcd9.up.railway.app/api/v1/auth/github/login' | grep -i location"
