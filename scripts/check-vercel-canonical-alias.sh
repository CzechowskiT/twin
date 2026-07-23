#!/usr/bin/env bash
#
# check-vercel-canonical-alias.sh — read-only guard against drift on
# `frontend/.vercel/project.json`. Exits non-zero (and prints a clear
# fix-up command) if the local link points at a non-canonical Vercel
# project. Never edits anything; it's a guard, not a fixer.
#
# Canonical mapping documented in
# `docs/VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md`:
#
#     canonical project name = "twin"
#     canonical org           = "team_kRoghq6m6ogPUxpuwDUongpN" (team scope: twin)
#     canonical public alias  = https://twin-sooty.vercel.app
#     preferred public domain = https://twin.care (Afternic NS must move to Vercel — see docs/RC1_DOMAIN_DNS_FOUNDER_ACTION.md)
#     topology manifest       = docs/PRODUCTION_TOPOLOGY_RC1.json
#
# The local link is allowed to drift to `twin-sooty` for historical
# reasons (Phase 1 git-push deploys still flow through the canonical
# `twin` project regardless of which project the CLI points at), but
# the guard prints a WARNING so the next maintenance window can fix
# the drift.
#
# Use modes:
#
#     bash scripts/check-vercel-canonical-alias.sh            # warn but exit 0
#     bash scripts/check-vercel-canonical-alias.sh --strict   # exit 1 on drift
#
# The strict mode is intended for use from a pre-push hook by ops
# only — not as a CI gate (CI doesn't need a vercel link at all).

set -euo pipefail

CANONICAL_PROJECT_NAME="twin"
CANONICAL_ORG_ID="team_kRoghq6m6ogPUxpuwDUongpN"
CANONICAL_PUBLIC_ALIAS="https://twin-sooty.vercel.app"

LINK="${LINK:-frontend/.vercel/project.json}"
MODE="${1:-warn}"

color_red()    { printf '\033[31m%s\033[0m\n' "$*"; }
color_yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
color_green()  { printf '\033[32m%s\033[0m\n' "$*"; }
color_dim()    { printf '\033[2m%s\033[0m\n' "$*"; }

if [ ! -f "$LINK" ]; then
  color_yellow "[vercel-canonical] No local link at $LINK"
  color_dim    "                    First-time setup: run 'cd frontend && npx vercel link --scope=twin --project=$CANONICAL_PROJECT_NAME'"
  if [ "$MODE" = "--strict" ]; then exit 1; fi
  exit 0
fi

PROJECT_NAME=$(python3 -c "import json;print(json.load(open('$LINK')).get('projectName',''))")
ORG_ID=$(python3      -c "import json;print(json.load(open('$LINK')).get('orgId',''))")

color_dim "[vercel-canonical] Reading $LINK"
color_dim "                    projectName=$PROJECT_NAME"
color_dim "                    orgId=$ORG_ID"

DRIFTED=0

if [ "$PROJECT_NAME" != "$CANONICAL_PROJECT_NAME" ]; then
  color_yellow "[vercel-canonical] DRIFT — local link projectName='$PROJECT_NAME' but canonical='$CANONICAL_PROJECT_NAME'"
  DRIFTED=1
fi

if [ "$ORG_ID" != "$CANONICAL_ORG_ID" ]; then
  color_red    "[vercel-canonical] CRITICAL — local link orgId='$ORG_ID' but canonical='$CANONICAL_ORG_ID'"
  color_red    "                    A 'vercel deploy' from this repo would publish to the wrong team."
  DRIFTED=2
fi

if [ "$DRIFTED" = "0" ]; then
  color_green "[vercel-canonical] OK — local link is canonical ($CANONICAL_PROJECT_NAME @ $CANONICAL_ORG_ID)"
  color_green "                    Public alias served from $CANONICAL_PUBLIC_ALIAS"
  exit 0
fi

cat <<EOF

[vercel-canonical] To fix the drift (open maintenance window first):

  cd frontend
  rm -rf .vercel
  npx vercel link --scope=twin --project=$CANONICAL_PROJECT_NAME --yes
  git add .vercel/project.json
  git commit -m "chore(vercel): re-link frontend to canonical '$CANONICAL_PROJECT_NAME' project"

Background and risk discussion:
  docs/VERCEL_CANONICAL_DEPLOY_RUNBOOK_2026-05-27.md
  docs/VERCEL_CANONICAL_ALIAS_GUARD_2026-05-27.md

EOF

if [ "$MODE" = "--strict" ]; then
  color_red "[vercel-canonical] --strict mode → exit 1"
  exit 1
fi

color_yellow "[vercel-canonical] Warn-only mode → exit 0 (drift logged, no action)"
exit 0
