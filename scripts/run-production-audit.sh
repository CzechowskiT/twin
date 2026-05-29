#!/usr/bin/env bash
# Non-destructive production audit helper — outputs JSON snapshots for docs/AUDIT_RESULTS_*.md
set -euo pipefail

API="${AUDIT_API:-https://twin-production-bcd9.up.railway.app}"
FE="${AUDIT_FE:-https://twin-sooty.vercel.app}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Git (branch cursor/phase1-monorepo-scaffold) ==="
cd "$REPO_ROOT"
git rev-parse HEAD
git log -1 --format='%ci %s'

echo
echo "=== Production curls ==="
for path in \
  "/api/v1/health" \
  "/api/v1/health?db=1&ops=1" \
  "/api/v1/health/celery-status" \
  "/api/v1/public/mvp-stats"; do
  echo "--- GET $path ---"
  curl -sS "${API}${path}" | python3 -m json.tool
done

echo "--- GET /api/v1/demo/snapshot (HTTP code) ---"
curl -sS -o /tmp/twin-demo-snapshot.json -w "HTTP %{http_code}\n" "${API}/api/v1/demo/snapshot"
python3 -c "import json; d=json.load(open('/tmp/twin-demo-snapshot.json')); print(json.dumps({k:d[k] for k in list(d)[:8]}, indent=2))" 2>/dev/null || head -c 400 /tmp/twin-demo-snapshot.json

echo "--- FE /status ---"
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "${FE}/status"

echo "--- FE proxy /api/v1/health ---"
curl -sS "${FE}/api/v1/health" | python3 -m json.tool

echo
echo "=== Local checks (optional) ==="
echo "Routes:"
python3 "$REPO_ROOT/scripts/audit-list-api-routes.py" | head -1

echo "Alembic HEAD:"
grep -h '^revision' "$REPO_ROOT/backend/alembic/versions/"*.py | tail -1

echo
echo "Done. Fill docs/AUDIT_RESULTS_<date>_claude.md from output above."
