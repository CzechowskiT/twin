# Smoke command reference — 2026-05-27

**Branch:** `cursor/phase1-monorepo-scaffold`
**Scope:** Backlog 23 of the long autonomous security session.
A docs-only operator reference for running the **same** smoke
checks locally that GitHub Actions runs on every push. This
file is the answer to "how do I reproduce the CI smoke
failure on my laptop?" — the canonical short answer used to
live across three docs; this consolidates it.

## What CI runs (paraphrased from `.github/workflows/smoke.yml`)

Three jobs on every push to `cursor/phase1-monorepo-scaffold`
or `main`, skipping pure docs commits (`paths-ignore: docs/**`
and `**/*.md`):

1. **`backend-smoke`** — 7 hand-picked pytest files, Python 3.12.
2. **`frontend-build`** — `npm ci && npm run build`, Node 20.
3. **`prod-health`** — runs only after the first two pass and
   only on `cursor/phase1-monorepo-scaffold` pushes; invokes
   `scripts/verify-prod-health.sh`.

## Reproducing `backend-smoke` locally

```bash
# from repo root:
cd backend
source .venv/bin/activate
pip install -r requirements.txt   # only the first time / after a deps bump

# the exact 7-file pytest set CI runs:
pytest \
  tests/test_health_features.py \
  tests/test_public_mvp_stats.py \
  tests/test_stripe_tier_mapping.py \
  tests/test_rocketjobs_parser.py \
  tests/test_recruiter_inbox.py \
  tests/test_nightly_auto_apply_mail.py \
  tests/test_ops_demo_refresh.py \
  -q
```

Expected: all green, < 30 s.

If you want a wider check (still cheap):

```bash
# all backend tests:
pytest -q
```

This catches regressions the CI smoke set doesn't.

## Reproducing `frontend-build` locally

```bash
cd frontend
npm ci                  # only the first time / after a lockfile bump
npm run lint            # not gated by CI today, but cheap and useful
npm run tsc             # same
npm run build           # the actual CI gate
```

Expected: `next build` exits 0; produces `.next/` and a build
summary table.

## Reproducing `prod-health` locally (optional, read-only)

```bash
chmod +x scripts/verify-prod-health.sh
./scripts/verify-prod-health.sh
```

This script hits production:

- `GET https://twin-production-bcd9.up.railway.app/api/v1/health`
- `GET https://twin-sooty.vercel.app/`

Both must return `200`. The script is read-only and safe to run
from any laptop with curl.

## Watching a live CI run

```bash
# what's running right now?
gh run list --workflow smoke.yml --limit 5

# tail a specific run:
gh run watch <run-id>

# why did a check fail?
gh run view <run-id> --log-failed
```

## Smoke debugging recipes

### "CI is red but I can't reproduce locally"

1. **Python version drift.** CI uses 3.12; your local venv may
   be 3.11 or 3.13. Check with `python --version` inside
   `backend/.venv`.
2. **Stale local DB.** Some tests use in-memory SQLite, others
   use `backend/twin.db`. Delete the file and re-run.
3. **Locale.** CI is en_US; if your shell is pl_PL, `datetime`
   formatting in tests may differ. Rare; mostly relevant for
   `test_recruiter_inbox.py`.
4. **Dependencies.** `pip install -r requirements.txt` after
   pulling.

### "The frontend build passes locally but fails on CI"

1. **Node version drift.** CI uses 20; your local Node may be
   18 or 22. Check with `node --version`.
2. **`npm ci` vs `npm install`.** Local devs sometimes run
   `npm install` and pick up unlocked versions. CI runs
   `npm ci` which respects the lockfile exactly. Run `npm ci`
   locally to match.
3. **Env vars.** `NEXT_PUBLIC_*` env vars baked into the build
   are inherited from the shell. If a build-time check needs
   a variable, CI provides it via GitHub Actions secrets; your
   laptop may not.

### "`prod-health` failed but the smoke jobs were green"

That's a production deploy failure, not a code failure. See:

- `docs/INCIDENT_RESPONSE_RUNBOOK_2026-05-27.md` §
  "API outage".
- `railway status --service=api` from the laptop.

## Push-coalescing reminder

If you push multiple commits at once (e.g. three docs commits
chained), GitHub Actions runs **one** workflow at the head
SHA. Intermediate commits show `total_count: 0` for check runs
but their changes are tested by the head SHA's run. See
`docs/CI_SMOKE_DOCS_ONLY_VERIFY_2026-05-27.md` for the deep
dive.

## Hard bans honoured

- ✅ Docs only.
- ✅ No `.github/workflows/` change.
- ✅ No source change.
- ✅ No `scripts/` change.
- ✅ No deploy / Railway / Vercel change.
- ✅ No secret in this reference.
- ✅ No UX / copy change.

## Files

- `docs/SMOKE_COMMAND_REFERENCE_2026-05-27.md` (this doc).

## Related

- `.github/workflows/smoke.yml` — source of truth for CI.
- `scripts/verify-prod-health.sh` — read-only prod health
  check.
- `docs/CI_SMOKE_DOCS_ONLY_VERIFY_2026-05-27.md` — why
  intermediate docs commits sometimes show no check runs.
- `docs/PR_TEMPLATE_PROPOSAL_2026-05-27.md` — the proposed
  template references these commands.

Backlog 23 of the long autonomous security session.
