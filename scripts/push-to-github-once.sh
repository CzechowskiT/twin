#!/usr/bin/env bash
# One-time push using a GitHub Personal Access Token (PAT).
#
# Set GITHUB_TOKEN before running (do not commit the token):
#   GITHUB_TOKEN='your_pat_here' ./scripts/push-to-github-once.sh
#
# WARNING: If you export GITHUB_TOKEN in your shell profile or type the token
# on its own line, it may end up in shell history. Prefer a single line:
#   GITHUB_TOKEN='...' ./scripts/push-to-github-once.sh
# so the token is only on that one command line (still visible in history for
# that session — clear history afterward if needed).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Błąd: ustaw GITHUB_TOKEN (np. GITHUB_TOKEN='...' ./scripts/push-to-github-once.sh)" >&2
  exit 1
fi

echo "Usuwam zapisane dane logowania github.com z pęku kluczy macOS (jeśli są)..."
security delete-internet-password -s github.com 2>/dev/null || true

echo "Wypycham na main..."
git push "https://CzechowskiT:${GITHUB_TOKEN}@github.com/CzechowskiT/stripe-checkout-app.git" HEAD:main

echo "Gotowe."
