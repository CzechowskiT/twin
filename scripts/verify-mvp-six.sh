#!/usr/bin/env bash
# Fast gate for the six MVP dashboard/status slices (local + optional prod URLs).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== backend pytest (mvp-six subset) =="
cd backend
if [[ -f .venv/bin/activate ]]; then
  # shellcheck source=/dev/null
  . .venv/bin/activate
fi
python3 -m pytest -q \
  tests/test_public_mvp_stats.py \
  tests/test_health_features.py \
  tests/test_celery_beat_schedule.py \
  tests/test_reminder_tasks.py \
  tests/test_webcal_feed.py

echo "== frontend build =="
cd "$ROOT/frontend"
npm run build

if [[ -n "${VERIFY_PROD_FRONTEND:-}" ]]; then
  echo "== prod status (frontend) =="
  curl -fsS "${VERIFY_PROD_FRONTEND%/}/status" -o /dev/null
  echo "OK ${VERIFY_PROD_FRONTEND}/status"
fi

if [[ -n "${VERIFY_PROD_API:-}" ]]; then
  echo "== prod mvp-stats (api) =="
  curl -fsS "${VERIFY_PROD_API%/}/api/v1/public/mvp-stats" | head -c 200
  echo ""
fi

echo "verify-mvp-six: all checks passed"
