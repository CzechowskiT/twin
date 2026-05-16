#!/bin/bash
# Wrzuca projekt TWIN na GitHub (jedna komenda dla założyciela).
# Użycie: ./scripts/wrzuc-na-github.sh TWOJ_LOGIN_GITHUB

set -euo pipefail
cd "$(dirname "$0")/.."

LOGIN="${1:-}"
if [ -z "$LOGIN" ]; then
  echo "Użycie: ./scripts/wrzuc-na-github.sh TWOJ_LOGIN_GITHUB"
  echo "Przykład: ./scripts/wrzuc-na-github.sh jan-kowalski"
  exit 1
fi

REMOTE="https://github.com/${LOGIN}/twin.git"

echo "=== TWIN → GitHub (${LOGIN}/twin) ==="
echo ""
echo "Upewnij się, że na github.com masz PUSTE repozytorium 'twin' (bez README)."
echo ""
read -r -p "Naciśnij Enter, gdy repozytorium jest gotowe..."

if git remote get-url origin &>/dev/null; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

echo ""
echo "Twój SECRET_KEY na Railway (skopiuj teraz):"
openssl rand -hex 32
echo ""

git add -A
git status -sb

if git diff --cached --quiet; then
  echo "Brak nowych zmian do commita — wysyłam istniejący kod."
else
  git commit -m "$(cat <<'EOF'
Prepare TWIN for online beta (deploy configs, UI, auto-apply).

EOF
)"
fi

BRANCH="$(git branch --show-current)"
echo ""
echo "Wysyłam na GitHub (branch: ${BRANCH})..."
git push -u origin "$BRANCH"

echo ""
echo "✅ Kod jest na: https://github.com/${LOGIN}/twin"
echo "Następny krok: otwórz docs/WDROZENIE_LINK.md — Część B (Railway) i C (Vercel)."
