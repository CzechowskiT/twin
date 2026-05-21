#!/usr/bin/env bash
# Generate OPS / recruiter / beta admin tokens into .env.railway (gitignored). Idempotent: only fills empty vars.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env.railway}"
EXAMPLE="$ROOT/.env.railway.example"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$EXAMPLE" "$ENV_FILE"
  echo "Created $ENV_FILE from example."
fi

gen() { openssl rand -hex 32; }

upsert() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    current=$(grep "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2-)
    if [[ -n "${current// }" ]]; then
      return 0
    fi
    sed -i.bak "/^${key}=/d" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  fi
  echo "${key}=${val}" >>"$ENV_FILE"
  echo "Set $key"
}

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl required" >&2
  exit 1
fi

OPS="${OPS_ADMIN_TOKEN:-$(gen)}"
RECR="${RECRUITER_INBOX_TOKEN:-$(gen)}"
upsert "OPS_ADMIN_TOKEN" "$OPS"
upsert "BETA_ADMIN_TOKEN" "$OPS"
upsert "RECRUITER_INBOX_TOKEN" "$RECR"
upsert "PARTNER_EXPORT_TOKEN" "$(gen)"

echo "Done. Apply to Railway: ./scripts/railway-apply-production-env.sh"
echo "Sync Vercel (after vercel login): ./scripts/vercel-apply-production-env.sh"
