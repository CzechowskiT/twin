#!/usr/bin/env bash
# Use only personal Microsoft tenant (Default Directory), not Developico.
set -euo pipefail

AZ="${AZ:-/Library/Frameworks/Python.framework/Versions/3.14/bin/az}"
# Your personal Entra tenant ("Default Directory") — not Developico.
PERSONAL_TENANT="651e0ae6-13dd-47e3-aad6-a007b758410f"

echo "==> Wylogowanie Azure CLI i czyszczenie cache..."
"$AZ" logout 2>/dev/null || true
rm -f ~/.azure/msal_http_cache.bin ~/.azure/msal_token_cache.bin 2>/dev/null || true

echo ""
echo "==> Logowanie TYLKO na konto osobiste (Default Directory)..."
echo "    NIE wybieraj Developico w przeglądarce."
echo ""
"$AZ" login \
  --use-device-code \
  --allow-no-subscriptions \
  --tenant "$PERSONAL_TENANT"

echo ""
echo "==> Aktywne konto:"
"$AZ" account show -o table

echo ""
echo "Aby całkowicie odłączyć Developico od konta Microsoft:"
echo "  https://myaccount.microsoft.com/organizations"
echo "  → znajdź Developico → Leave organization / Opuść organizację"
