#!/usr/bin/env bash
# Run market-coverage scrape with per-board JSON logs (repo root).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
export PYTHONPATH="${PYTHONPATH:-}:$PWD"

MODE="${1:-dry-run}"
BOARDS="${SCRAPE_BOARDS:-}"

ARGS=(python3 scripts/scrape_market_coverage.py)
if [[ -n "$BOARDS" ]]; then
  ARGS+=(--boards "$BOARDS")
fi
case "$MODE" in
  persist)
    ARGS+=(--persist)
    ;;
  dry-run|*)
    ARGS+=(--dry-run)
    ;;
esac

echo "TWIN market coverage scrape ($MODE) boards=${BOARDS:-all}"
exec "${ARGS[@]}"
