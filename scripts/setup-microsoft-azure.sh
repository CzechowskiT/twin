#!/usr/bin/env bash
# Creates Entra app registration for TWIN local dev and writes ~/Projects/twin/.env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
AZ="${AZ:-az}"

REDIRECT_AUTH="http://localhost:8000/api/v1/auth/microsoft/callback"
REDIRECT_CAL="http://localhost:8000/api/v1/calendar/microsoft/callback"
APP_NAME="${APP_NAME:-TWIN local dev}"

if ! command -v "$AZ" >/dev/null 2>&1; then
  echo "Brak Azure CLI. Zainstaluj: pip3 install azure-cli"
  exit 1
fi

echo "==> Logowanie do Azure (jeśli trzeba)..."
# Personal Default Directory — skip work tenants blocked by Conditional Access.
PERSONAL_TENANT="${AZURE_TENANT_ID:-651e0ae6-13dd-47e3-aad6-a007b758410f}"
if ! "$AZ" account show >/dev/null 2>&1; then
  echo "    Użyj konta OSOBISTEGO Microsoft (nie Developico)."
  echo "    Tenant: Default Directory ($PERSONAL_TENANT)"
  "$AZ" login --use-device-code --allow-no-subscriptions --tenant "$PERSONAL_TENANT"
fi

echo "==> Tworzenie rejestracji aplikacji: $APP_NAME"
APP_ID=$("$AZ" ad app create \
  --display-name "$APP_NAME" \
  --sign-in-audience AzureADandPersonalMicrosoftAccount \
  --web-redirect-uris "$REDIRECT_AUTH" "$REDIRECT_CAL" \
  --query appId -o tsv)

echo "   Application (client) ID: $APP_ID"

echo "==> Client secret (ważny 1 rok)..."
SECRET=$("$AZ" ad app credential reset \
  --id "$APP_ID" \
  --display-name "twin-dev" \
  --years 1 \
  --query password -o tsv)

# Microsoft Graph delegated permission IDs
GRAPH="00000003-0000-0000-c000-000000000000"
"$AZ" ad app permission add --id "$APP_ID" --api "$GRAPH" \
  --api-permissions \
    e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope \
    7427e0e9-2fba-42e9-a867-330d7620341a=Scope \
    1ec239c8-d089-4a8d-b2e8-32d3480c67c3=Scope \
    37f7f235-527c-4136-ac3e-2a472fd4cc18=Scope \
    14dad69e-099b-42c9-810b-d037da24eb63=Scope \
    64a6cdd6-aab1-4faf-94b8-ecc386d5bc6b=Scope \
  >/dev/null 2>&1 || true

echo "==> Zapis do .env..."
node "$ROOT/scripts/sync-microsoft-env.mjs" "$APP_ID" "$SECRET"

echo ""
echo "Gotowe. Zrestartuj API (make api) i testuj:"
echo "  http://localhost:3000/login → Kontynuuj z Microsoft"
