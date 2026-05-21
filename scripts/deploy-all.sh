#!/usr/bin/env bash
# One-shot: generate secrets → Railway API vars → Vercel env (when CLIs are logged in).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

./scripts/generate-deploy-secrets.sh

if npx --yes @railway/cli@4 whoami >/dev/null 2>&1; then
  ./scripts/railway-apply-production-env.sh
  ./scripts/railway-apply-worker-env.sh || echo "Railway worker: skip or create twin-worker (docs/RAILWAY_WORKER_PL.md)" >&2
else
  echo "Railway: skip (run: npx @railway/cli login && npx @railway/cli link)" >&2
fi

if (cd frontend && npx --yes vercel@latest whoami >/dev/null 2>&1); then
  ./scripts/vercel-apply-production-env.sh
else
  echo "Vercel: skip (run: cd frontend && npx vercel login)" >&2
fi

echo "Git push triggers Vercel/Railway deploy when connected to cursor/phase1-monorepo-scaffold."
