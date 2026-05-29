# P1 Release Baseline — 2026-05-27

TASK 1 of the 2026-05-27 morning release-hygiene run. Captures
the **state of the world** for `cursor/phase1-monorepo-scaffold`
**before** any change in this run — git tree, local gates,
production smoke. Every subsequent task in this run is gated on
the verdict captured here ("safe to keep shipping docs / tests
on this branch").

## TL;DR

- Branch `cursor/phase1-monorepo-scaffold` is **clean**, **up to
  date with origin**, **no uncommitted changes**.
- Local gates pass — `npm run lint`, `npx tsc --noEmit`,
  `npm run build` all 0 errors / 0 warnings.
- Production canonical alias `https://twin-sooty.vercel.app`
  serves a Ready deployment from
  `cursor/phase1-monorepo-scaffold`; all 7 smoke routes
  return `200`.
- Backend identifies itself as `twin-api`, `db_ok=true`,
  Celery worker `celery@81fddac7429c` is `active`,
  `validated_jobs=652`, `market_coverage_feed_stale=false`.
- 37 stashes on this machine; `stash@{0}` is still the
  documented `ci-hardening-pending-pat-scope` CI workflow edit
  (see TASK 2 in this run).

Verdict: **safe to keep shipping docs / tests on this branch.**

## Git state (this machine, `cursor/phase1-monorepo-scaffold`)

```
$ git fetch --all --prune
From https://github.com/CzechowskiT/twin
 * branch            cursor/phase1-monorepo-scaffold -> FETCH_HEAD

$ git status -sb
## cursor/phase1-monorepo-scaffold...origin/cursor/phase1-monorepo-scaffold

$ git log --oneline -15
cd648b4 docs(release): record overnight engineering progress
703efe1 docs(observability): outline p1 logging metrics tracing plan
ddce6dd docs(security): outline p1 auth and observability next steps
a03e68a docs(vercel): document production alias workflow
50dedde chore(ci): harden p1 release checks
a022f14 test(dashboard): add safe dashboard smoke coverage
b62a22e refactor(dashboard): finalize dashboard composition
92a6661 docs(release): verify 564f032 and 8b53e1d on prod
8b53e1d refactor(dashboard): extract job application actions
564f032 refactor(dashboard): extract job list actions
b35dc65 refactor(dashboard): extract modal state
f49c077 refactor(dashboard): extract calendar actions
f926741 refactor(dashboard): extract application actions
28205ea refactor(dashboard): extract dashboard state hooks
0bfadc2 refactor(dashboard): split dashboard page into sections
```

- `HEAD` = `cd648b4` (`docs(release): record overnight engineering progress`).
- Working tree is clean — no untracked files in `frontend/`,
  `backend/`, or `docs/` that touch this run.
- Local `git stash list` shows 37 stashes (separate inventory).
  `stash@{0}` is `On cursor/phase1-monorepo-scaffold:
  ci-hardening-pending-pat-scope` — the workflow edit waiting on
  a PAT with `workflow` scope (handled in TASK 2 of this run).

## Local gates (frontend)

Run from `frontend/` on `cursor/phase1-monorepo-scaffold` at
`HEAD=cd648b4`.

| Gate                      | Result   |
| ------------------------- | -------- |
| `npm run lint` (eslint)   | 0 errors / 0 warnings |
| `npx tsc --noEmit`        | 0 errors |
| `npm run build` (Next 16) | 0 errors, all routes prerendered or marked `ƒ` (dynamic) as expected |

No new code is shipped in TASK 1; this is a baseline-only run.
The build output confirms the production app graph still
matches what's live (same set of static + dynamic routes,
including `/dashboard`, `/waitlist`, `/demo`, `/status`,
`/login/candidate`, the API health proxy, etc.).

## Production smoke — `https://twin-sooty.vercel.app`

```
$ for p in / /waitlist /demo /status /login/candidate /dashboard /api/public-health; do
    code=$(curl -L -o /dev/null -s -w "%{http_code}" "https://twin-sooty.vercel.app${p}")
    echo "${code}  ${p}"
  done

200  /
200  /waitlist
200  /demo
200  /status
200  /login/candidate
200  /dashboard
200  /api/public-health
```

All 7 routes return `200`. None of the candidate-only mutation
endpoints were hit (no `POST` to `/api/v1/applications/...`, no
auto-apply, no scrape). This is purely a `GET`-only smoke pass
against the canonical alias.

### Security header set on `/` (canonical alias)

```
HTTP/2 200
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
content-security-policy-report-only: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

- HSTS preload still on.
- CSP still in **`report-only`** by design — see
  `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md` §1 for the
  Phase 1 enforcement plan and why the flip is gated on the
  Next 16 nonce spike. TASK 4 of this run carries that work
  forward into a concrete sprint-ready checklist.

### Backend health (`GET /api/public-health` — JSON)

```json
{
    "status": "ok",
    "service": "twin-api",
    "git_commit": "86176cce024b700f3e3494131e9480686bdbe92c",
    "db_ok": true,
    "mail_configured": true,
    "google_oauth_configured": true,
    "github_oauth_configured": true,
    "apple_oauth_configured": false,
    "microsoft_oauth_configured": true,
    "google_calendar_configured": true,
    "microsoft_calendar_configured": true,
    "stripe_checkout_ready": true,
    "scrape_worker_ready": true,
    "scrape_beat_enabled": true,
    "linkedin_oauth_configured": true,
    "recruiter_inbox_configured": true,
    "partner_export_configured": true,
    "validated_jobs": 652,
    "market_coverage_last_scrape_at": "2026-05-27T03:10:20Z",
    "market_coverage_progress_pct": 24,
    "market_coverage_active_validated": 2403,
    "market_coverage_feed_stale": false,
    "market_coverage_warnings": "active_corpus_below_half_target",
    "market_coverage_ops_hint": "Market scrape beat OK \u2014 see GET /admin/market-coverage-status",
    "celery": {
        "celery_task_always_eager": false,
        "broker_configured": true,
        "nightly_auto_apply_beat_enabled": true,
        "beat_schedule_has_nightly": true,
        "worker_active": true,
        "worker_nodes": [
            "celery@81fddac7429c"
        ]
    }
}
```

Backend SHA `86176cce` matches the value reported by the
overnight run (no API redeploy expected today — TASK brief
explicitly bans an API redeploy in this run).

Notes:

- `apple_oauth_configured=false` is **known and intended** —
  Apple OAuth is a P2 follow-up; see
  `docs/APPLE_LOGIN_FOUNDER_PL.md`.
- `market_coverage_warnings=active_corpus_below_half_target` is
  a soft warning, not a red flag — the scrape beat is running,
  the corpus is just below the 5k-validated target (`active_
  validated=2403`). No action needed in this run (no scrape
  allowed by the hard bans anyway).
- `celery_task_always_eager=false` — Celery worker actually
  runs jobs in prod, not synchronously in-process. Mirrored by
  a live worker node (`celery@81fddac7429c`).

## Vercel production deployment

```
$ npx vercel inspect twin-sooty.vercel.app
Fetching deployment "twin-sooty.vercel.app" in twin
> Fetched deployment "twin-p7cjh4943-twin.vercel.app" in twin [512ms]

  General
    id      dpl_Fxpx2ncvmaqLMaC8pbJtYbuWANir
    name    twin
    target  production
    status  ● Ready
    url     https://twin-p7cjh4943-twin.vercel.app
    created Tue May 26 2026 16:47:24 GMT+0200 [~17h ago]

  Aliases
    ╶ https://twin-sooty.vercel.app
    ╶ https://twin-git-cursor-phase1-monorepo-scaffold-twin.vercel.app
```

- Latest production deployment in the canonical project (`twin`)
  was created **~17h ago** (overnight run; consistent with
  `cd648b4` being the latest commit on the branch).
- Both the canonical alias and the branch-preview alias point
  at the same deployment, so candidates and the agent see the
  exact same build.
- The local `frontend/.vercel/project.json` still points at the
  **`twin-sooty`** project (drift; see
  `docs/VERCEL_PROJECT_ALIAS_RUNBOOK_2026-05-26.md` and
  TASK 3 of this run for the canonical day-to-day runbook).

## Hard bans honoured

- No API redeploy.
- No DB migration.
- No scrape / auto-apply / application action triggered.
- No prod env change.
- No secret in this doc.
- No force-push, no destructive git operation.
- No new feature / UX / copy.

## Files

- This doc (new).

## Related

- `docs/OVERNIGHT_ENGINEERING_REPORT_2026-05-26_TO_2026-05-27.md`
  — yesterday's report; `HEAD` matches the prod state recorded
  here.
- `docs/VERCEL_PROJECT_ALIAS_RUNBOOK_2026-05-26.md` — origin of
  the `twin` vs `twin-sooty` project drift; resolved at
  runbook level in TASK 3 of this run.
- `docs/P1_CI_HARDENING_2026-05-26.md` — origin of the
  `ci-hardening-pending-pat-scope` stash; carried forward in
  TASK 2 of this run.
- `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md` — origin of the
  Phase 1 security backlog; tightened into a sprint-ready
  checklist in TASK 4 of this run.
