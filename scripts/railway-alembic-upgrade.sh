#!/usr/bin/env bash
# Run Alembic upgrade on Railway API service (requires linked project + twin service).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"

echo "Migrations run on every API deploy via backend/scripts/start-api.sh (alembic upgrade head)."
echo "To run manually inside Railway:"
echo "  railway link -p responsible-success -s twin"
echo "  railway ssh -s twin -- alembic upgrade head   # requires ~/.ssh key"
echo ""
echo "Optional local check (uses prod env; needs reachable DATABASE_URL):"
(cd "$ROOT/backend" && npx --yes @railway/cli@4 run --service twin -- alembic current) || true
