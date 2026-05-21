#!/usr/bin/env bash
# Merge .env.railway.example defaults into .env.railway without overwriting non-empty values.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env.railway}"
EXAMPLE="$ROOT/.env.railway.example"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$EXAMPLE" "$ENV_FILE"
  echo "Created $ENV_FILE"
fi

upsert_if_empty() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    local current
    current=$(grep "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2-)
    if [[ -n "${current// }" ]]; then
      return 0
    fi
    sed -i.bak "/^${key}=/d" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  fi
  echo "${key}=${value}" >>"$ENV_FILE"
  echo "Filled $key"
}

gen_secret() {
  openssl rand -hex 32
}

upsert_if_empty "RAILWAY_API_URL" "https://twin-production-bcd9.up.railway.app"
upsert_if_empty "FRONTEND_URL" "https://twin-sooty.vercel.app"
upsert_if_empty "CORS_ORIGINS" "https://twin-sooty.vercel.app"
upsert_if_empty "API_URL" "https://twin-production-bcd9.up.railway.app"
upsert_if_empty "ENVIRONMENT" "production"
upsert_if_empty "CELERY_BROKER_URL" '${{Redis.REDIS_URL}}'
upsert_if_empty "CELERY_RESULT_BACKEND" '${{Redis.REDIS_URL}}'
# Strip common corruption from manual Raw Editor paste (port 6379}).
if grep -qE 'CELERY_BROKER_URL=.*6379\}\}' "$ENV_FILE" 2>/dev/null; then
  sed -i.bak 's|^CELERY_BROKER_URL=.*|CELERY_BROKER_URL=${{Redis.REDIS_URL}}|' "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  sed -i.bak 's|^CELERY_RESULT_BACKEND=.*|CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}|' "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  sed -i.bak 's|^REDIS_URL=.*|REDIS_URL=${{Redis.REDIS_URL}}|' "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  echo "Fixed malformed CELERY_BROKER_URL / REDIS_URL in $ENV_FILE"
fi
upsert_if_empty "CELERY_TASK_ALWAYS_EAGER" "false"
upsert_if_empty "SCRAPE_WORKER_READY" "true"
upsert_if_empty "SCRAPE_BEAT_ENABLED" "true"
upsert_if_empty "AUTO_APPLY_HEADLESS" "true"
upsert_if_empty "MICROSOFT_TENANT" "common"

if ! grep -q "^SECRET_KEY=" "$ENV_FILE" 2>/dev/null || [[ -z "$(grep "^SECRET_KEY=" "$ENV_FILE" | cut -d= -f2-)" ]]; then
  upsert_if_empty "SECRET_KEY" "$(gen_secret)"
fi

echo "Done. Run: ./scripts/generate-deploy-secrets.sh && ./scripts/apply-prod-autonomous.sh"
