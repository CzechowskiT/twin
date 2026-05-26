# P1 CI Hardening — 2026-05-26

TASK 5 of the overnight engineering run. Hardens the
`.github/workflows/smoke.yml` pipeline so every PR + every push
to `cursor/phase1-monorepo-scaffold` (and `main`) runs the same
quality gates a human engineer would run locally before pushing:
`npm run lint` (0 problems), `npx tsc --noEmit` (0 errors),
`npm run build` (0 errors), a parse check of the Playwright
smoke spec, plus a broader read-only backend pytest selection.

## TL;DR

- `frontend-build` job renamed to **`frontend-checks`**.
- Adds `npm run lint`, `npx tsc --noEmit`, and `npx playwright
  test --list` before `npm run build`. Catches lint / type /
  spec-parse drift at PR time instead of after merge.
- `backend-smoke` job test selection expanded from **7 files**
  to **13 files** — same isolation profile (no live boards, no
  real applications, no external OAuth, no real Stripe checkout
  call). New selections cover application-submission truth
  table, placement verification state machine, celery health,
  compliance / GDPR exports, subscription gates, and the
  pracuj.pl parser.
- `prod-health` job's `needs:` array now references the renamed
  `frontend-checks` job. Behaviour unchanged otherwise — still
  gated on `push` to `cursor/phase1-monorepo-scaffold` only.
- **Locally validated** — `pytest` collects 28 tests across the
  six **new** files and all 28 pass on this machine (7.25s).
- **`npm run lint` + `npx tsc --noEmit` + `npm run build`** —
  already validated by TASK 3.

## PAT scope blocker (this run)

Repo workflows live under `.github/workflows/`. GitHub requires
the `workflow` PAT scope to push edits to those files. The
overnight agent's first push of this slice **was rejected**
with the expected error:

```
! [remote rejected] cursor/phase1-monorepo-scaffold -> cursor/phase1-monorepo-scaffold
  (refusing to allow a Personal Access Token to create or update workflow
   `.github/workflows/smoke.yml` without `workflow` scope)
error: failed to push some refs to 'https://github.com/CzechowskiT/twin.git'
```

To stay within the overnight hard-bans (no PAT scope change,
no force-push, no admin token), the agent:

1. Soft-reset the local commit (`git reset --soft HEAD~1`).
2. Stashed the workflow edit under the message
   `ci-hardening-pending-pat-scope` (`git stash list` will
   surface it on the same machine for a human follow-up).
3. Committed and pushed **only** this documentation file so the
   plan + the proposed YAML are recorded for the human owner.

A human with the `workflow` PAT scope can apply the edit by:

```
$ git stash pop stash@{0}        # restores .github/workflows/smoke.yml
$ git add .github/workflows/smoke.yml
$ git commit -m "chore(ci): harden p1 release checks (workflow file)"
$ git push origin cursor/phase1-monorepo-scaffold
```

…or by pasting the **proposed YAML** below directly into
GitHub's web UI on the `cursor/phase1-monorepo-scaffold` branch
(the web editor uses the user's session, not the PAT).

## Proposed `.github/workflows/smoke.yml` (full file, after edit)

```yaml
name: smoke

on:
  push:
    branches:
      - cursor/phase1-monorepo-scaffold
      - main
  pull_request:

jobs:
  backend-smoke:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: backend/requirements.txt
      - run: pip install -r requirements.txt
      # Strategic read-only / unit-style coverage. Each file here
      # exercises a critical contract without touching live job
      # boards, real applications, or external OAuth. See
      # docs/P1_CI_HARDENING_2026-05-26.md for the selection
      # rationale.
      - run: |
          pytest tests/test_health_features.py \
            tests/test_public_mvp_stats.py \
            tests/test_stripe_tier_mapping.py \
            tests/test_rocketjobs_parser.py \
            tests/test_pracuj_parser.py \
            tests/test_recruiter_inbox.py \
            tests/test_nightly_auto_apply_mail.py \
            tests/test_ops_demo_refresh.py \
            tests/test_application_submission_truth.py \
            tests/test_placement_verification.py \
            tests/test_health_celery_status.py \
            tests/test_compliance.py \
            tests/test_subscription_gates.py \
            -q

  frontend-checks:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - name: ESLint (0 problems)
        run: npm run lint
      - name: TypeScript --noEmit (0 errors)
        run: npx tsc --noEmit
      - name: Next.js production build
        run: npm run build
      - name: Playwright spec parse check (no execution)
        run: npx playwright test --list

  prod-health:
    if: github.event_name == 'push' && github.ref == 'refs/heads/cursor/phase1-monorepo-scaffold'
    runs-on: ubuntu-latest
    needs: [backend-smoke, frontend-checks]
    steps:
      - uses: actions/checkout@v4
      - name: Prod API + frontend smoke
        run: chmod +x scripts/verify-prod-health.sh && ./scripts/verify-prod-health.sh
```

## Backend test selection rationale

| Test file                                  | Why it's in CI                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `test_health_features.py` (existing)       | `/api/v1/health` shape — ops flags, db ping, celery status. Catches health-contract drift.                      |
| `test_public_mvp_stats.py` (existing)      | `/api/v1/public/mvp-stats` shape — investor-facing public numbers.                                              |
| `test_stripe_tier_mapping.py` (existing)   | Stripe price-id → tier mapping. Catches a wrong tier in pricing page.                                           |
| `test_rocketjobs_parser.py` (existing)     | RocketJobs scraper parser-only unit. No network, no DB.                                                         |
| `test_pracuj_parser.py` (**new**)          | Pracuj.pl scraper parser-only unit. Symmetric with `rocketjobs` (Phase 1 supports both boards).                 |
| `test_recruiter_inbox.py` (existing)       | Recruiter inbox contract — pre-launch B2B surface.                                                              |
| `test_nightly_auto_apply_mail.py` (existing) | Nightly auto-apply email rendering — does not POST anywhere.                                                  |
| `test_ops_demo_refresh.py` (existing)      | Investor demo refresh ops endpoint — catches a missing-flag regression.                                         |
| `test_application_submission_truth.py` (**new**) | The "no CS tennis" application-truth table — confirms only attempts with evidence count as confirmed.    |
| `test_placement_verification.py` (**new**) | Placement state-machine (`declare → verify_start → employer_attest → dispute`) per docs/PLACEMENT_VERIFICATION. |
| `test_health_celery_status.py` (**new**)   | `/api/v1/health/celery-status` shape. Catches a regression that drops `worker_active`.                          |
| `test_compliance.py` (**new**)             | GDPR export / privacy compliance surfaces.                                                                      |
| `test_subscription_gates.py` (**new**)     | Plan-tier gating contract — keeps free/pro/premium boundaries explicit.                                         |

All thirteen are **unit / contract** style. None of them:

- ❌ scrape a live job board;
- ❌ POST to a real `/applications/auto-apply`;
- ❌ exchange a real Google / Microsoft / Apple OAuth token;
- ❌ hit Stripe in test mode (only assert config / shape);
- ❌ send a real email;
- ❌ touch the production database.

## Frontend job changes

Before:

```yaml
frontend-build:
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: "20", cache: npm }
    - run: npm ci
    - run: npm run build
```

After:

```yaml
frontend-checks:
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: "20", cache: npm }
    - run: npm ci
    - name: ESLint (0 problems)
      run: npm run lint
    - name: TypeScript --noEmit (0 errors)
      run: npx tsc --noEmit
    - name: Next.js production build
      run: npm run build
    - name: Playwright spec parse check (no execution)
      run: npx playwright test --list
```

The spec parse check via `playwright test --list` does **not**
execute the browser; it just confirms every test in `e2e/` is
syntactically valid + the discovery filters match what the
overnight TASK 4 doc claims (8 cases). This catches a future
typo (e.g. `test_describe` instead of `test.describe`) before
the browser run is wired in.

## Why not run Playwright headless in CI yet?

- Playwright Chromium needs `apt-get` system dependencies (~600
  MB image) — slows the pipeline by ~90s per PR.
- The current spec depends on a running `npm run start` server
  (the default `webServer` config in `playwright.config.ts`).
  CI would need a `wait-for-it` step or a separate
  `PLAYWRIGHT_SKIP_WEBSERVER=1` + `PLAYWRIGHT_BASE_URL=…`
  override pointing at the preview deployment.
- Phase 1 priority is "ship without breaking what's shipped";
  the lint + tsc + build + spec-parse + read-only pytest +
  prod-health gates already catch every regression the
  Playwright spec would catch at this scope (routes 200,
  proxy alive, auth redirect to `/login`).

Recommended next step (Phase 2): add a `frontend-e2e` job that
runs against the **preview deployment URL** (the
`twin-git-cursor-phase1-monorepo-scaffold-twin.vercel.app`
preview alias) only on push events. That keeps PRs fast while
still catching pre-prod regressions.

## Verification

- `pytest` collected 28 tests across the six new files; all 28
  passed locally (`backend/` cwd, Python 3.14, 7.25s).
- Existing 7-file pytest selection continues to pass (covered
  by previous PRs).
- `npm run lint` clean (TASK 3 + TASK 4 already ran it).
- `npx tsc --noEmit` clean (TASK 3 + TASK 4 already ran it).
- `npm run build` clean (TASK 3 + TASK 4 already ran it).
- `npx playwright test --list` enumerates 8 tests (TASK 4).
- YAML hand-checked: indentation, no tab characters, every
  job's `runs-on` set, every step's `name` / `run` valid.

## Files

- `.github/workflows/smoke.yml` — rename `frontend-build` →
  `frontend-checks`; add lint / tsc / spec-parse steps; expand
  backend pytest selection.
- This doc.

## Hard bans honoured

- No env / secrets / tokens in the workflow file or this doc.
- No PAT scope change requested in this run.
- No force-push, no destructive git operation.
- Read-only / unit-style tests only — no live actions.
- No backend changes — workflow + doc only.
