#!/usr/bin/env bash
# Set founder demo env on linked Railway API service (no other secrets touched).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"

DEMO_EMAIL="${DEMO_USER_EMAIL:-demo@twin.career}"

CLI=(npx --yes @railway/cli@4)

if ! "${CLI[@]}" whoami >/dev/null 2>&1; then
  echo "Not logged in. Set RAILWAY_TOKEN in .env.railway or run: npx @railway/cli login" >&2
  exit 1
fi

echo "Set DEMO_MODE_ENABLED=true"
"${CLI[@]}" variables set DEMO_MODE_ENABLED=true --skip-deploys

echo "Set DEMO_USER_EMAIL=$DEMO_EMAIL"
"${CLI[@]}" variables set "DEMO_USER_EMAIL=$DEMO_EMAIL" --skip-deploys

echo "Redeploying API service…"
"${CLI[@]}" redeploy --yes

API_URL="${RAILWAY_API_URL:-https://twin-production-bcd9.up.railway.app}"
echo "Done. Verify after deploy:"
echo "  curl -sS \"$API_URL/api/v1/demo/snapshot\" | jq '.demo_user_configured, .source, .candidate.name'"
