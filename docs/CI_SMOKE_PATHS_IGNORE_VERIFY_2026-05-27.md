# CI — Smoke `paths-ignore` Verification (docs-only) — 2026-05-27

**Scope:** TASK 6 of the 3-hour security session on
`cursor/phase1-monorepo-scaffold`. **Verification only — no
`smoke.yml` edit in this commit** (per the session's HARD BANS).

## What the workflow does today

`.github/workflows/smoke.yml` is configured to skip CI when a
push or PR touches **only** documentation:

```yaml
on:
  push:
    branches:
      - cursor/phase1-monorepo-scaffold
      - main
    paths-ignore:
      - docs/**
      - "**/*.md"
  pull_request:
    paths-ignore:
      - docs/**
      - "**/*.md"
```

`paths-ignore` is a per-trigger filter: when **every** file in a
push diff matches one of the listed globs, GitHub Actions does
**not** create any workflow runs for that event. The expected
behaviour for the four configurations we ship:

| Push contents                                                | smoke triggers?            |
| ------------------------------------------------------------ | -------------------------- |
| **`docs/foo.md` only**                                       | **no**                     |
| **`README.md` only** (root markdown)                         | **no**                     |
| **`backend/app/api/foo.py` only**                            | yes                        |
| **mixed `docs/foo.md` + `backend/...`**                      | yes (any non-ignored file) |
| **`scripts/foo.sh` only**                                    | yes                        |

## Verification done in this session

The 3-hour security session pushed **five** commits to
`cursor/phase1-monorepo-scaffold`, two of which include backend
code and three of which are docs-only. Cross-referencing the
SHAs against GitHub's `repos/.../commits/{sha}/check-runs`
API shows exactly the expected paths-ignore behaviour:

| Commit SHA | Subject                                                              | Files touched (top-level)                          | smoke run?                |
| ---------- | -------------------------------------------------------------------- | -------------------------------------------------- | ------------------------- |
| `b7c0622`  | `fix(security): rate limit beta waitlist signup` (docs-only commit) | `docs/P1_BETA_WAITLIST_RATE_LIMIT_2026-05-27.md`    | **no** (`check_runs: 0`)  |
| `dd0b8a2`  | `fix(security): gate auto-apply trigger-sweep to ops allowlist`     | `backend/app/api/auto_apply_settings.py`, `backend/tests/test_auto_apply_trigger_sweep_admin_gate.py`, `docs/...` | yes — run `26505110534` ✅ success |
| `2372522`  | `docs(stripe): design webhook event idempotency`                    | `docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md`   | **no** (`check_runs: 0`)  |
| `0dfc6c9`  | `feat(security): csp violation report sink`                         | `backend/app/api/csp_reports.py`, `backend/app/api/router.py`, `backend/tests/test_csp_report.py`, `docs/...` | yes — run `26505357728` ✅ success |
| `2431c49`  | `docs(security): design authenticated mutation rate-limit`          | `docs/P2_AUTHENTICATED_MUTATION_RATE_LIMIT_DESIGN_2026-05-27.md` | **no** (`check_runs: 0`)  |

Raw evidence (run from this branch tip):

```text
$ for sha in b7c0622 2372522 2431c49; do
    gh api repos/CzechowskiT/twin/commits/$sha/check-runs \
      | jq '{sha: "'$sha'", total: .total_count, names: [.check_runs[].name]}'
  done
{ "sha": "b7c0622", "total": 0, "names": [] }
{ "sha": "2372522", "total": 0, "names": [] }
{ "sha": "2431c49", "total": 0, "names": [] }
```

All three docs-only pushes produced **zero check runs**.

```text
$ gh run list --branch cursor/phase1-monorepo-scaffold --limit 5
completed success feat(security): csp violation report sink                        smoke push 26505357728 1m0s
completed success fix(security): gate auto-apply trigger-sweep to ops allowlist    smoke push 26505110534 1m6s
completed success Update smoke.yml                                                  smoke push 26504541247 1m3s
completed success fix(ci): align prod health script with public health contract    smoke push 26504209909 1m5s
completed failure docs(release): record p1 security ops session                    smoke push 26501730253 1m8s
```

Both code-touching pushes ran smoke and went green.

## Edge cases worth knowing

These come up in the GitHub Actions docs for `paths` /
`paths-ignore` — none required a fix in this session, but
they're worth recording so the next reviewer doesn't have to
rederive them:

1. **`paths-ignore` is per-event, not per-job.** If a single
   push has *any* non-ignored file, every job in the workflow
   runs — including `prod-health`, which intentionally only
   runs on `cursor/phase1-monorepo-scaffold` pushes. The job
   filter `if: github.event_name == 'push' && github.ref == ...`
   in `smoke.yml` is the right place for "only run prod-health
   on the integration branch" logic, not `paths-ignore`.
2. **Merge commits inherit the merged-in diff.** If a docs-only
   PR is squash-merged onto a non-docs commit on `main`, the
   resulting `main` SHA does include code — so `paths-ignore`
   doesn't apply. Not a regression risk for us today
   (`main` is downstream of this branch), but worth a mental
   note.
3. **`**/*.md` is anchored to the repo root.** Files like
   `docs/sub/foo.md` match both `docs/**` and `**/*.md`. We
   keep both globs in `smoke.yml` for clarity, even though
   `**/*.md` alone would cover the docs case. Removing
   `docs/**` would also skip CI for *non-markdown* files inside
   `docs/` (rare, but e.g. attached images); keeping it means
   even non-markdown docs additions skip smoke as long as they
   live under `docs/`.
4. **`pull_request` filter doesn't see commit history.** It
   evaluates the changed files in the **PR diff**, not in each
   individual commit. A PR that mixes docs and code commits
   still triggers smoke; that's the right behaviour because the
   final merge state needs the test pass.

## What was **not** changed

- **`.github/workflows/smoke.yml`** — untouched. The session's
  HARD BANS explicitly forbid editing this file unless the task
  is docs-only verification only; this task is docs-only
  verification only, and the verification confirmed the file
  is already configured correctly.
- **No new workflow file.** Other CI is out of scope for a
  paths-ignore verification.
- **No CI badge / status check addition.** Out of scope.

## Verdict

`paths-ignore` is **working as designed**: the three docs-only
commits in this session produced zero check runs, while the two
code-touching commits ran smoke and went green. No fix needed.

If we ever want to extend the ignore list (e.g. to also skip
smoke for `LICENSE`, `*.txt`, or top-level images), the one-line
addition under each `paths-ignore:` block is the place; the
verification protocol above (commit → push → `gh api
.../check-runs`) is the way to confirm it.

## Hard bans honoured (this run)

- **No `smoke.yml` edit.**
- No CI workflow rename / move.
- No new dependency / runner pin change.
- No prod env change.
- No Railway / Vercel deploy.
- No DB migration.
- No secrets in this doc (only commit SHAs and run IDs, both
  already public on GitHub).

## Files in this commit

- `docs/CI_SMOKE_PATHS_IGNORE_VERIFY_2026-05-27.md` (this doc) —
  only.

## Related

- `.github/workflows/smoke.yml` — the workflow under
  verification.
- `docs/CI_SMOKE_HEALTH_FIX_2026-05-27.md` — same-day sibling
  doc covering the prod-health curl path.
