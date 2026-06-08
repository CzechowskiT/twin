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
echo

check_marketing_header() {
  local base="$1"
  local html
  html=$(curl -fsSL "${base%/}/" 2>/dev/null || true)
  if [[ -z "$html" ]]; then
    echo "FAIL: ${base}/ unreachable"
    return 1
  fi
  if [[ "$html" != *"twin-header-bar"* ]]; then
    echo "FAIL: ${base}/ missing marketing header shell (twin-header-bar)"
    return 1
  fi
  if [[ "$html" != *"twin-header-account-link"* ]]; then
    echo "FAIL: ${base}/ missing header login/register links"
    return 1
  fi
  if [[ "$html" == *"twin-persona-switcher"* ]]; then
    echo "WARN: ${base}/ still serves legacy persona dropdown — deploy may be stale"
  fi
  echo "OK: ${base}/ marketing header shell + account links"
  return 0
}

header_fail=0
for alias in "$FRONTEND_URL" "https://twin-society.vercel.app"; do
  check_marketing_header "$alias" || header_fail=1
done
if [[ "$header_fail" -ne 0 ]]; then
  echo "HINT: twin-society must be on Vercel project twin — see docs/VERCEL_PROJECT_ALIAS_RUNBOOK_2026-05-26.md"
  exit 1
fi

echo
echo "Demo walkthrough smoke:"
demo_code=$(curl -sS -o /dev/null -w "%{http_code}" "${FRONTEND_URL%/}/demo")
if [[ "$demo_code" != "200" ]]; then
  echo "FAIL: ${FRONTEND_URL%/}/demo HTTP $demo_code"
  exit 1
fi
echo "OK: /demo HTTP 200"
