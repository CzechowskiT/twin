# Overnight Release Verify — `8b53e1d` (Phase 5D-2, Dashboard Job Application Actions) — 2026-05-26

TASK 2 of the overnight engineering run. Confirms that the
Phase 5D-2 cleanup commit
`8b53e1d refactor(dashboard): extract job application actions` is
**live in production** on the canonical alias
`https://twin-sooty.vercel.app/dashboard`, that the new
`useDashboardJobApplicationActions` hook is wired into the candidate
dashboard, and that the two-hook mutual dependency
(`useDashboardJobApplicationActions` ↔ `useDashboardJobListActions`)
is resolved without runtime errors. No backend, env, or migration
change.

## TL;DR

- Prod alias `twin-sooty.vercel.app` is on deployment
  `dpl_BLdUoeQDxsDiPCjMMs9VQLpnuHf9`, built from commit `8b53e1d`
  (Phase 5D-2). **No redeploy required.**
- Local gates green on `8b53e1d`: lint 0, tsc 0, `next build` 0.
- Smoke routes — `/`, `/dashboard`, `/login`, `/register`,
  `/waitlist`, `/api/public-health` — all HTTP 200.
- `page.tsx` LoC at this commit: **473** (down from 514 at
  `564f032`, −41, −8.0%). On track for the TASK 3 target of
  350-450 LoC.
- New hook
  `frontend/src/hooks/dashboard/use-dashboard-job-application-actions.ts`
  exists, 178 LoC, owns `applyToJob` / `autoApplyToJob` /
  `setJobApplication` / `autoApplyingId` with byte-identical
  endpoints, payloads, `Idempotency-Key` minting, refresh chain
  and `window.open` flags vs. `564f032`. **No real application
  fired during verification.**
- Hard bans respected: no live auto-apply, no live `applyToJob`
  call, no scrape, no LinkedIn bypass, no migrations, no prod env
  change, no force-push, no `.env` / token / JWT in this report.

## Git preflight

```
$ git checkout cursor/phase1-monorepo-scaffold
$ git pull --ff-only
$ git status
On branch cursor/phase1-monorepo-scaffold
Your branch is up to date with 'origin/cursor/phase1-monorepo-scaffold'.
nothing to commit, working tree clean

$ git log --oneline -6
8b53e1d refactor(dashboard): extract job application actions   ← prod HEAD (target)
564f032 refactor(dashboard): extract job list actions
b35dc65 refactor(dashboard): extract modal state
f49c077 refactor(dashboard): extract calendar actions
f926741 refactor(dashboard): extract application actions
28205ea refactor(dashboard): extract dashboard state hooks
```

`8b53e1d` was authored at `Tue May 26 16:21:45 +0200`. The Vercel
build for this SHA started at `Tue May 26 16:21:53 +0200` —
roughly 8 seconds after the push hit GitHub. Auto-deploy via the
`cursor/phase1-monorepo-scaffold` branch hook on the `twin`
project worked as designed.

## Vercel state — canonical alias

```
$ npx vercel inspect twin-sooty.vercel.app
Fetching deployment "twin-sooty.vercel.app" in twin
> Fetched deployment "twin-21vzhwf9b-twin.vercel.app" in twin [438ms]

  General
    id     dpl_BLdUoeQDxsDiPCjMMs9VQLpnuHf9
    target production
    status ● Ready
    url    https://twin-21vzhwf9b-twin.vercel.app

  Aliases
    ╶ https://twin-sooty.vercel.app
    ╶ https://twin-git-cursor-phase1-monorepo-scaffold-twin.vercel.app

Build log: Cloning ... Branch: cursor/phase1-monorepo-scaffold, Commit: 8b53e1d
```

The canonical alias is owned by Vercel project `twin` (root), not
the locally-linked `twin-sooty`. See
`docs/VERCEL_PROJECT_ALIAS_RUNBOOK_2026-05-26.md`. We did **not**
touch `.vercel/project.json` in this verify pass.

## Quality gates on prod HEAD (`8b53e1d`)

Run locally on the same SHA:

```
$ cd frontend
$ npm run lint
> eslint
(0 problems)

$ npx tsc --noEmit
(0 errors)

$ npm run build
✓ Compiled successfully
ƒ Proxy (Middleware)
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

`next build` enumerates every dashboard / candidate / company /
recruiter / placement / login / register route — all marked
static or dynamic as designed, none missing, none failed.

## Smoke routes

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
/api/healthz: 404   (expected — no FE proxy at that path)
```

`/dashboard` is the only consumer of the new hook. It loads
without 500/404 and serves a `200` from Vercel cache
(`x-vercel-cache: HIT`).

## Public-health (backend)

Same backend HEAD as TASK 0 (`86176cc`):

- `db_ok: true`
- `celery.worker_active: true`, `worker_nodes:
  ["celery@81fddac7429c"]`
- `celery.celery_task_always_eager: false`
- `celery.broker_configured: true`
- `celery.beat_schedule_has_nightly: true`
- `validated_jobs: 652`
- `market_coverage_active_validated: 2341`

No regressions vs. TASK 0 — the verify steps for the two FE
commits don't touch the backend.

## Hook wiring (visual / grep)

```
$ rg -l "useDashboardJobApplicationActions" frontend/src
frontend/src/hooks/dashboard/use-dashboard-job-application-actions.ts
frontend/src/app/dashboard/page.tsx

$ rg -n "useDashboardJobApplicationActions|useDashboardJobListActions|trackLinkOpenedRef" frontend/src/app/dashboard/page.tsx
41:import { useDashboardJobApplicationActions } from "@/hooks/dashboard/use-dashboard-job-application-actions";
42:import { useDashboardJobListActions } from "@/hooks/dashboard/use-dashboard-job-list-actions";
143:  const trackLinkOpenedRef = useRef<((jobId: number) => void | Promise<void>) | null>(null);
150:  } = useDashboardJobApplicationActions({
157:    trackLinkOpenedRef,
166:  } = useDashboardJobListActions({
176:    setJobApplication,
184:    trackLinkOpenedRef.current = trackLinkOpened;
```

Wiring matches the design in
`docs/P1_DASHBOARD_JOB_APPLICATION_ACTIONS_2026-05-26.md`:

1. `useDashboardJobApplicationActions` is destructured first; it
   reads a `trackLinkOpenedRef` from `useRef`.
2. `useDashboardJobListActions` is destructured second; it
   receives `setJobApplication` as an injected callback (used by
   `dismissJob`'s "rejected" branch).
3. `useEffect(() => { trackLinkOpenedRef.current =
   trackLinkOpened; }, [trackLinkOpened])` keeps the ref pointed
   at the latest `trackLinkOpened` identity.
4. `applyToJob` is byte-identical to its inline-function form on
   `564f032`: `window.open(url, "_blank", "noopener,noreferrer")`
   first, then `void trackLinkOpenedRef.current?.(jobId)`.

## Endpoints / payloads (1:1 with `564f032`)

| Handler             | Endpoint                            | Method | Body / headers                                                                                | Where it lives now                                            |
| ------------------- | ----------------------------------- | ------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `setJobApplication` | `/api/v1/applications/`             | `POST` | `{ job_id, status }`, `Idempotency-Key` (UUID when `crypto.randomUUID` exists)                | `use-dashboard-job-application-actions.ts:75`                 |
| `applyToJob`        | (delegates to `trackLinkOpened`)    | —      | `window.open(url, "_blank", "noopener,noreferrer")` + `void trackLinkOpened(jobId)`           | `use-dashboard-job-application-actions.ts:115`                |
| `autoApplyToJob`    | `/api/v1/applications/auto-apply`   | `POST` | `{ job_id, human_acknowledged: true }`                                                        | `use-dashboard-job-application-actions.ts:124`                |
| Auto-apply PDF      | `result.package_pdf_url` (optional) | —      | `window.open(result.package_pdf_url, "_blank", "noopener,noreferrer")`                        | `use-dashboard-job-application-actions.ts:149`                |

Every i18n key (`dashboard.applicationTrackedAppliedToast`,
`dashboard.applyOpenedToast`), every refresh-chain step
(`syncApplicationsFromApi(await loadApplications(token))` →
`setDevFocus(await loadDevelopmentFocus(token))`), every
`setError(dashboardFetchUserMessage(...))` error mapping, every
`setError(null)` pre-clear, and the `finally` `setAutoApplyingId(null)`
busy-lock cleanup match the `564f032` behaviour. **Verified by
diff against the inline functions removed from `page.tsx`**, no
behavioural drift introduced.

## What did **not** run

- ❌ No live `applyToJob` button click on prod (no
  `window.open("noopener,noreferrer")` triggered).
- ❌ No live `autoApplyToJob` request on prod (we did not POST to
  `/api/v1/applications/auto-apply`).
- ❌ No scrape (`SCRAPE_RESPECT_ROBOT=1` keeps LinkedIn blocked
  anyway; we never invoked `/api/v1/admin/scrape-all`).
- ❌ No login with founder/demo passwords. Verify pass is
  read-only over the public surface (`/`, `/dashboard` render,
  public-health JSON, header probes).
- ❌ No Railway redeploy (this is a FE-only refactor).
- ❌ No `.env` / token / JWT inclusion in this report.

## LoC trajectory (page.tsx)

| Commit    | `frontend/src/app/dashboard/page.tsx` | Δ    | Note                                            |
| --------- | ------------------------------------- | ---- | ----------------------------------------------- |
| `0bfadc2` | (pre-split, ~1.2k LoC)                | —    | Section split start                             |
| `28205ea` | (post-state-hooks)                    | —    | Dashboard state hooks extracted                 |
| `f926741` | 707                                   | —    | Application actions hook                        |
| `f49c077` | 671                                   | −36  | Calendar actions hook                           |
| `b35dc65` | 612                                   | −59  | Modal state hook                                |
| `564f032` | 514                                   | −98  | Job list actions hook                           |
| `8b53e1d` | **473**                               | −41  | **Job application actions hook (this pass)**    |

Target for TASK 3 is 350-450 LoC. 473 is within striking distance;
one more focused slice (likely match-feedback + match visibility
view-model) should bring it under 450 cleanly.

## Verdict

✅ Phase 5D-2 (`8b53e1d`) is live in production via canonical
alias `https://twin-sooty.vercel.app`. Dashboard renders, smoke
routes 200, security headers strong, public-health JSON
unchanged, hook wiring verified by grep + diff against
`564f032`, all quality gates green on the same SHA prod serves.
Safe state. No further deploy required to ship this slice.
