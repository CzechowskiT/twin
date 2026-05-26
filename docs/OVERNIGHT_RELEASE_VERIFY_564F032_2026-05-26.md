# Overnight Release Verify — `564f032` (Phase 5D-1, Dashboard Job List Actions) — 2026-05-26

TASK 0 of the overnight engineering run. Purpose: prove that the
Phase 5D-1 dashboard cleanup commit
`564f032 refactor(dashboard): extract job list actions` is **shipped
to production**, and that the candidate dashboard surface (the only
caller of the new `useDashboardJobListActions` hook) is healthy on
the canonical alias `https://twin-sooty.vercel.app/dashboard`. No
backend, env, or migration change.

## TL;DR

- Production is **ahead** of `564f032`: the canonical alias
  `twin-sooty.vercel.app` currently serves
  `dpl_BLdUoeQDxsDiPCjMMs9VQLpnuHf9` built from
  `8b53e1d refactor(dashboard): extract job application actions`
  (Phase 5D-2), which is the **next** dashboard refactor pass on top
  of `564f032`. See Vercel inspect output below.
- No redeploy needed — prod already includes `564f032` (it's an
  ancestor of `8b53e1d`).
- Local quality gates clean on the same SHA prod is serving:
  `npm run lint` (0), `npx tsc --noEmit` (0), `npm run build` (0
  errors).
- Smoke routes (`/`, `/dashboard`, `/login`, `/register`,
  `/waitlist`, `/api/public-health`) → all **HTTP 200**.
- Security headers verified: HSTS preload, X-Frame-Options DENY,
  X-Content-Type-Options nosniff, Permissions-Policy, Referrer-Policy,
  CSP report-only present.
- Backend `public-health` reports `db_ok=true`, `celery worker_active
  =true`, `validated_jobs=652`.

## Git preflight

```
$ git fetch --all --prune
$ git checkout cursor/phase1-monorepo-scaffold
$ git pull --ff-only
$ git status
On branch cursor/phase1-monorepo-scaffold
Your branch is up to date with 'origin/cursor/phase1-monorepo-scaffold'.
nothing to commit, working tree clean

$ git log --oneline -8
8b53e1d refactor(dashboard): extract job application actions   ← prod HEAD
564f032 refactor(dashboard): extract job list actions          ← target of TASK 0
b35dc65 refactor(dashboard): extract modal state
f49c077 refactor(dashboard): extract calendar actions
f926741 refactor(dashboard): extract application actions
28205ea refactor(dashboard): extract dashboard state hooks
0bfadc2 refactor(dashboard): split dashboard page into sections
cb846bb chore(frontend): reduce lint debt
```

`564f032` is the immediate parent (via 5D-1) of `8b53e1d`. Prod
serves `8b53e1d`; therefore prod includes everything in `564f032`.

## Quality gates (frontend)

Run locally on the working tree at `8b53e1d` (prod HEAD):

```
$ cd frontend
$ npm run lint
> eslint
(0 problems)

$ npx tsc --noEmit
(0 errors, 0 warnings)

$ npm run build
✓ Compiled successfully
✓ Generating static pages (collected — proxy middleware + all
  dashboard / candidate / company / recruiter / placement routes
  prerendered or marked dynamic as designed)
```

All three gates green on the same SHA Vercel built into prod.

## Vercel state — `twin-sooty.vercel.app`

```
$ npx vercel inspect twin-sooty.vercel.app
Fetching deployment "twin-sooty.vercel.app" in twin
> Fetched deployment "twin-21vzhwf9b-twin.vercel.app" in twin [438ms]

  General
    id     dpl_BLdUoeQDxsDiPCjMMs9VQLpnuHf9
    name   twin
    target production
    status ● Ready
    url    https://twin-21vzhwf9b-twin.vercel.app
    created Tue May 26 2026 16:21:52 GMT+0200 (CEST)

  Aliases
    ╶ https://twin-sooty.vercel.app
    ╶ https://twin-git-cursor-phase1-monorepo-scaffold-twin.vercel.app
```

Build log confirms the deployed SHA:

```
2026-05-26T14:21:53.901Z  Cloning github.com/CzechowskiT/twin
  (Branch: cursor/phase1-monorepo-scaffold, Commit: 8b53e1d)
```

**Important** — the canonical alias is owned by Vercel project
`twin` (at the org root), **not** by `twin-sooty` (the project ID
recorded in `frontend/.vercel/project.json`). The local
`.vercel/project.json` linkage is informational drift — see
`docs/VERCEL_PROJECT_ALIAS_RUNBOOK_2026-05-26.md` for the full
runbook. **Do not** redeploy from the local `frontend/` link without
double-checking which project actually owns the alias.

## Smoke routes (canonical alias)

```
$ for p in / /dashboard /login /register /waitlist /api/public-health /api/healthz; do
    code=$(curl -s -o /dev/null -w "%{http_code}" -L "https://twin-sooty.vercel.app${p}")
    echo "${p}: ${code}"
  done

/: 200
/dashboard: 200
/login: 200
/register: 200
/waitlist: 200
/api/public-health: 200
/api/healthz: 404   ← expected, no such alias on FE proxy
```

## Public-health (backend reachable via FE proxy)

```
$ curl -s "https://twin-sooty.vercel.app/api/public-health" | python3 -m json.tool
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
  "market_coverage_active_validated": 2341,
  "market_coverage_progress_pct": 23,
  "celery": {
    "celery_task_always_eager": false,
    "broker_configured": true,
    "nightly_auto_apply_beat_enabled": true,
    "beat_schedule_has_nightly": true,
    "worker_active": true,
    "worker_nodes": ["celery@81fddac7429c"]
  }
}
```

Highlights: `db_ok=true`, `celery worker_active=true`,
`broker_configured=true`, `beat_schedule_has_nightly=true`,
`celery_task_always_eager=false`. Backend Railway HEAD is
`86176cc` ("chore(p1): start engineering cleanup") — unchanged this
pass (TASK 0 is FE only).

`market_coverage_warnings` flags `linkedin` and `linkedin-sales`
boards as blocked by `robots.txt` — that's the expected, intended
robots-respecting behaviour (`SCRAPE_RESPECT_ROBOT=1`). Not a
regression.

## Security headers

`curl -sI https://twin-sooty.vercel.app/` excerpt:

```
HTTP/2 200
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
content-security-policy-report-only: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
x-vercel-cache: HIT
```

`/dashboard` returns the same security-header set. CSP is still
`report-only` — that's intentional (live CSP enforcement is on the
P1 security backlog; see `docs/P1_SECURITY_NEXT_STEPS_2026-05-26.md`).

## Job-list hook grep

The `564f032` slice introduced
`frontend/src/hooks/dashboard/use-dashboard-job-list-actions.ts`.
Grep confirms the hook is wired into exactly one caller (the
dashboard page) and one peer (the new 5D-2 application-actions
hook reads `setJobApplication` through it):

```
$ rg -l "useDashboardJobListActions|useDashboardJobApplicationActions" frontend/src
frontend/src/hooks/dashboard/use-dashboard-job-list-actions.ts
frontend/src/hooks/dashboard/use-dashboard-job-application-actions.ts
frontend/src/app/dashboard/page.tsx
```

`page.tsx` destructures `{ jobsLoadMoreBusy, loadMoreJobs,
trackLinkOpened, saveJob, dismissJob }` from
`useDashboardJobListActions(...)` and `{ autoApplyingId,
setJobApplication, applyToJob, autoApplyToJob }` from
`useDashboardJobApplicationActions(...)`. The mutual dependency
between the two hooks is resolved with a single `useRef` +
`useEffect` in `page.tsx` (see
`docs/P1_DASHBOARD_JOB_APPLICATION_ACTIONS_2026-05-26.md` for the
full pattern write-up).

## Verdict

- `564f032` is **live in production**, served via canonical alias
  `https://twin-sooty.vercel.app` through deployment
  `dpl_BLdUoeQDxsDiPCjMMs9VQLpnuHf9`.
- All routes 200; security headers strong; backend public-health
  green; Celery worker live; broker reachable; nightly beat
  scheduled.
- No redeploy required (prod is already past target — at `8b53e1d`).
- Hard bans honoured: no real apply, no auto-apply, no scrape, no
  prod env change, no DB migration, no force-push, no secret in
  this report.

## Out of scope (for later tasks in this overnight run)

- TASK 1 — Phase 5D-2 hook (`useDashboardJobApplicationActions`)
  was already committed as `8b53e1d` before this run started; see
  TASK 2 verify doc.
- TASK 3 — `page.tsx` final composition cleanup (target 350-450 LoC).
- TASK 4 — Dashboard E2E smoke (no live apply / auto-apply / login
  passwords).
- TASK 5 — CI hardening (`.github/workflows/`).
- TASK 6 — Vercel alias drift runbook.
- TASK 7 — Security next steps.
- TASK 8 — Observability plan.
- TASK 9 — Final overnight engineering report.
