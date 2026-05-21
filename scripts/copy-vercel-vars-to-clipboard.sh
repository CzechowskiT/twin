#!/usr/bin/env bash
# Copy Vercel production env block to clipboard (macOS).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env.railway}"
read_var() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' || true
}
OPS_ADMIN_TOKEN=$(read_var OPS_ADMIN_TOKEN)
BETA_ADMIN_TOKEN=$(read_var BETA_ADMIN_TOKEN)
RECRUITER_INBOX_TOKEN=$(read_var RECRUITER_INBOX_TOKEN)
RAILWAY_API_URL=$(read_var RAILWAY_API_URL)
API="${RAILWAY_API_URL:-https://twin-production-bcd9.up.railway.app}"
block=$(cat <<EOF
NEXT_PUBLIC_API_URL=${API}
TWIN_API_BASE_URL=${API}
OPS_ADMIN_TOKEN=${OPS_ADMIN_TOKEN:-}
BETA_ADMIN_TOKEN=${BETA_ADMIN_TOKEN:-${OPS_ADMIN_TOKEN:-}}
RECRUITER_INBOX_TOKEN=${RECRUITER_INBOX_TOKEN:-}
EOF
)
printf '%s' "$block" | pbcopy
echo "Skopiowano zmienne Vercel do schowka. Vercel → twin → Settings → Environment Variables → Production → wklej pary."
open "https://vercel.com" 2>/dev/null || true
