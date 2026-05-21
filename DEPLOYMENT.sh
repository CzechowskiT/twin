#!/usr/bin/env bash
# One-shot production deploy helper (env + smoke). See docs/PROD_AUTONOMOUS.md.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT/scripts/apply-prod-autonomous.sh"
