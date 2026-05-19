#!/usr/bin/env bash
# Phase 0 verification — security fixes from MERGED-AUDIT-2026-05-19.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== TWIN Phase 0 Verification ==="
echo ""

echo "✓ Checking git branch..."
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" = "cursor/phase0-deploy-security" ]; then
  echo "  ✅ On branch: $BRANCH"
else
  echo "  ⚠️  Expected cursor/phase0-deploy-security, got: $BRANCH"
fi

echo ""
echo "✓ Recent commits:"
git log --oneline -5

echo ""
echo "✓ Running Phase 0 security tests..."
cd backend
pytest tests/test_integrations_ats.py \
       tests/test_startup_validation.py \
       tests/test_auth_reset_password_rate_limit.py \
       tests/test_scrape_authorization.py \
       tests/test_config.py \
       -v --tb=short
TEST_EXIT=$?
cd ..

echo ""
echo "✓ Verifying frontend build..."
cd frontend
if npm run build > /dev/null 2>&1; then
  echo "  ✅ Frontend builds successfully"
  BUILD_EXIT=0
else
  echo "  ❌ Frontend build failed"
  BUILD_EXIT=1
fi
cd ..

echo ""
echo "=== SUMMARY ==="
if [ "$TEST_EXIT" -eq 0 ] && [ "$BUILD_EXIT" -eq 0 ]; then
  echo "✅ Phase 0 checks passed"
  echo ""
  echo "Next: merge cursor/phase0-deploy-security → cursor/phase1-monorepo-scaffold,"
  echo "set Vercel repo CzechowskiT/twin, Railway env vars (see docs/DEPLOY.md)."
  exit 0
fi
echo "❌ Some checks failed"
exit 1
