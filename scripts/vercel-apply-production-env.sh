#!/usr/bin/env bash
# Push server env vars to linked Vercel project (requires `npx vercel login` + link in frontend/).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${VERCEL_ENV_FILE:-$ROOT/.env.railway}"
FRONTEND="$ROOT/frontend"

export VERCEL_TOKEN="${VERCEL_TOKEN:-$(grep -E '^VERCEL_TOKEN=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — run ./scripts/generate-deploy-secrets.sh first." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/scripts/load-env-railway.sh" "$ENV_FILE"

CLI=(npx --yes vercel@latest)

if ! (cd "$FRONTEND" && "${CLI[@]}" whoami >/dev/null 2>&1); then
  echo "Not logged in. Run: cd frontend && npx vercel login" >&2
  exit 1
fi

push_env() {
  local name="$1"
  local value="$2"
  if [[ -z "${value// }" ]]; then
    echo "Skip $name (empty)"
    return 0
  fi
  echo "Set $name on Vercel (production)"
  (cd "$FRONTEND" && printf '%s' "$value" | "${CLI[@]}" env add "$name" production --force) || true
}

API_PUBLIC="${NEXT_PUBLIC_API_URL:-${RAILWAY_API_URL:-}}"
if [[ -n "$API_PUBLIC" ]]; then
  push_env "NEXT_PUBLIC_API_URL" "$API_PUBLIC"
  push_env "TWIN_API_BASE_URL" "$API_PUBLIC"
fi

push_env "OPS_ADMIN_TOKEN" "${OPS_ADMIN_TOKEN:-}"
push_env "BETA_ADMIN_TOKEN" "${BETA_ADMIN_TOKEN:-${OPS_ADMIN_TOKEN:-}}"
push_env "RECRUITER_INBOX_TOKEN" "${RECRUITER_INBOX_TOKEN:-}"

echo "Redeploy production from Vercel dashboard or: cd frontend && npx vercel --prod"
