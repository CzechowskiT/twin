#!/usr/bin/env bash
# Run ensure-founder-demo-profile.py against production Postgres (public URL).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"

CLI=(npx --yes @railway/cli@4)
export DATABASE_URL="$("${CLI[@]}" variables --service Postgres --json | python3 -c "import json,sys; print(json.load(sys.stdin)['DATABASE_PUBLIC_URL'])")"
export DEMO_USER_EMAIL="${FOUNDER_DEMO_EMAIL:-czechowski@protonmail.ch}"

exec python3 "$ROOT/scripts/ensure-founder-demo-profile.py" "$@"
