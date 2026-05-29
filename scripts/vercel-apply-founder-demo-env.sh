#!/usr/bin/env bash
# Set NEXT_PUBLIC_DEMO_USER_EMAIL on linked Vercel production project.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"
DEMO_EMAIL="${DEMO_USER_EMAIL:-demo@twin.career}"

ENV_FILE="${VERCEL_ENV_FILE:-$ROOT/.env.railway}"
export VERCEL_TOKEN="${VERCEL_TOKEN:-$(grep -E '^VERCEL_TOKEN=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)}"

CLI=(npx --yes vercel@latest)

if ! (cd "$FRONTEND" && "${CLI[@]}" whoami >/dev/null 2>&1); then
  echo "Not logged in. Run: cd frontend && npx vercel login" >&2
  echo "Or set VERCEL_TOKEN in .env.railway" >&2
  exit 1
fi

if [[ ! -f "$FRONTEND/.vercel/project.json" ]]; then
  echo "Vercel project not linked. Manual:" >&2
  echo "  cd frontend && npx vercel env add NEXT_PUBLIC_DEMO_USER_EMAIL production" >&2
  echo "  Value: $DEMO_EMAIL" >&2
  exit 1
fi

echo "Set NEXT_PUBLIC_DEMO_USER_EMAIL=$DEMO_EMAIL (production)"
(cd "$FRONTEND" && "${CLI[@]}" env rm NEXT_PUBLIC_DEMO_USER_EMAIL production --yes 2>/dev/null || true)
(cd "$FRONTEND" && "${CLI[@]}" env add NEXT_PUBLIC_DEMO_USER_EMAIL production \
  --value "$DEMO_EMAIL" \
  --no-sensitive \
  --yes \
  --force)

echo "Redeploy: cd frontend && npx vercel --prod"
