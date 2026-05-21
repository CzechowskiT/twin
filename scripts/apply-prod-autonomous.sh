#!/usr/bin/env bash
# One entry: local env file → secrets → Railway/Vercel (when tokens/CLI) → prod smoke.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== ensure .env.railway =="
./scripts/ensure-env-railway.sh
./scripts/generate-deploy-secrets.sh

# shellcheck source=/dev/null
source "$ROOT/scripts/railway-auth.sh"

echo "== Railway API + worker =="
if npx --yes @railway/cli@4 whoami >/dev/null 2>&1; then
  if ./scripts/railway-apply-production-env.sh; then
    ./scripts/railway-apply-worker-env.sh || echo "Worker service not linked yet (see docs/RAILWAY_WORKER_PL.md)" >&2
  else
    echo "Railway apply failed (run: npx @railway/cli link). Falling back to clipboard…" >&2
    ./scripts/copy-railway-vars-to-clipboard.sh 2>/dev/null || true
  fi
else
  echo "Railway CLI: not authenticated." >&2
  echo "  Option A: add RAILWAY_TOKEN=... to .env.railway (Railway → Account → Tokens)" >&2
  echo "  Option B: npx @railway/cli login && npx @railway/cli link" >&2
  echo "  Option C: ./scripts/copy-railway-vars-to-clipboard.sh → Railway Raw Editor → Deploy" >&2
  ./scripts/copy-railway-vars-to-clipboard.sh 2>/dev/null || true
fi

echo "== Vercel =="
if (cd frontend && npx --yes vercel@latest whoami >/dev/null 2>&1); then
  ./scripts/vercel-apply-production-env.sh
elif [[ -n "${VERCEL_TOKEN:-}" ]]; then
  (cd frontend && npx --yes vercel@latest whoami --token "$VERCEL_TOKEN" >/dev/null 2>&1) && \
    VERCEL_TOKEN="$VERCEL_TOKEN" ./scripts/vercel-apply-production-env.sh || true
else
  echo "Vercel: not linked. Run: cd frontend && npx vercel login && npx vercel link" >&2
  ./scripts/copy-vercel-vars-to-clipboard.sh 2>/dev/null || true
fi

echo "== verify prod =="
./scripts/verify-prod-health.sh || true

echo "== git push triggers deploy when GitHub integration is on =="
git push origin cursor/phase1-monorepo-scaffold 2>/dev/null || echo "Push skipped or already up to date."
