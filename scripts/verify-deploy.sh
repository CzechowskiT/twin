#!/usr/bin/env bash
# Sprint Day 1: read-only deploy drift checks (no secrets required).
set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-https://twin-sooty.vercel.app}"
BRANCH="${DEPLOY_BRANCH:-cursor/phase1-monorepo-scaffold}"
REMOTE="${GIT_REMOTE:-origin}"

echo "== TWIN deploy verify =="
echo "Frontend: $FRONTEND_URL"
echo "Expected branch: $BRANCH"
echo

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git fetch "$REMOTE" "$BRANCH" 2>/dev/null || true
  if git rev-parse "$REMOTE/$BRANCH" >/dev/null 2>&1; then
    echo "Local git expected SHA ($REMOTE/$BRANCH):"
    git rev-parse "$REMOTE/$BRANCH"
    echo "Short: $(git rev-parse --short "$REMOTE/$BRANCH")"
  else
    echo "WARN: cannot resolve $REMOTE/$BRANCH (fetch failed or branch missing)"
  fi
else
  echo "WARN: not inside a git repo"
fi
echo

echo "Health (via Vercel proxy):"
curl -fsS "${FRONTEND_URL%/}/api/v1/health" | jq . 2>/dev/null || curl -fsS "${FRONTEND_URL%/}/api/v1/health"
echo

echo "Compare Vercel Production deployment commit SHA to the git SHA above."
echo "Billing smoke: open ${FRONTEND_URL%/}/dashboard/billing and search DOM for twin-billing-surface"
