#!/usr/bin/env bash
# Run Alembic upgrade on Railway API service (requires linked project + twin service).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"

echo "Running: alembic upgrade head (Railway service twin)…"
npx --yes @railway/cli@4 run --service twin -- alembic upgrade head
echo "Done."
