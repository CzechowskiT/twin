# P1 Dashboard State / Data Cleanup — 2026-05-26

Phase 1, frontend cleanup pass #4. Extracts data-loading, exports, and
scrape polling out of the candidate dashboard page into reusable hooks
without changing any user-facing behaviour (no copy, no API, no auth, no
section order, no styling).

## Why

After `0bfadc2` the dashboard was already split into section components
(`MatchesSection`, `JobsSection`, …) but `app/dashboard/page.tsx` was
still 1 435 LoC of mixed concerns:

- 65 lines of `useState` declarations
- ~270 lines of loaders + the bootstrap effect + the placement-verify
  deep-link effect + the title-filter primer effect
- ~110 lines of an inline `setTimeout`-based scrape polling loop with
  four mutable refs
- ~85 lines of five near-identical "download blob / save as file" busy
  state machines

That made the page hard to navigate during reviews and made future
extractions (React Query / SWR migration, Storybook-isolated section
tests) much riskier than they need to be.

## Scope

Hard bans (all respected):

- No backend / API / auth changes
- No Railway / worker / scraper / auto-apply changes
- No new features, no UX or copy changes
- No React Query or SWR introduction
- No `Nietrafione` (match feedback "not relevant") behaviour change

## LoC before / after

| File | Before | After |
| --- | ---: | ---: |
| `frontend/src/app/dashboard/page.tsx` | 1 435 | **826** |
| `frontend/src/hooks/dashboard/use-dashboard-data.ts` | — | 470 |
| `frontend/src/hooks/dashboard/use-dashboard-exports.ts` | — | 125 |
| `frontend/src/hooks/dashboard/use-dashboard-polling.ts` | — | 245 |

`page.tsx` shrank by **609 lines (−42 %)** — well below the
1 000–1 100 LoC target — while the moved code lives in three small,
named, typed hooks colocated under `frontend/src/hooks/dashboard/`.

## What moved

### `useDashboardData(t)`

Owns the "read side" of the dashboard:

- State: `user`, `profile`, `matches`, `jobs`, `feedStats`,
  `applications`, `applicationsTotal`, `devFocus`, `filterOptions`,
  `filters`, `titleFilterPrimed`, `error`, `savedJobIds`,
  `dashboardCalendarBundle`, `lastUpdated`, `matchesRefreshing`,
  `dashboardBootstrapping`, `matchFeedbackByJobId`,
  `matchFeedbackBusyJobId`, `placementEventsInvalidateKey`,
  `dashboardWebcalUrl`.
- Loaders: `loadJobs`, `loadMatches`, `loadMatchFeedback`,
  `loadApplications`, `loadDevelopmentFocus`, `loadSavedJobIds`,
  `loadGoogleCalendarStrip`, `syncApplicationsFromApi`.
- Effects:
  - Bootstrap (auth check → 401 ⇒ login redirect, profile fetch, filter
    options, initial `refreshDashboardData`).
  - Title-filter primer from `profile.preferred_job_titles`.
  - `?placement_verify=<token>` deep-link confirmation flow.
  - Restore persisted filters (`loadStoredJobFilters`).
  - Restore persisted webcal URL.
- Memos: `applicationByJobId`, `displayApplicationStatus`.
- Action: `applyJobFilters` (persist + refresh).

### `useDashboardExports({ t, setError })`

Wraps the five blob/JSON downloads + their busy flags:

- `downloadApplicationsCsv` / `downloadApplicationsXlsx`
- `downloadMatchesCsv` / `downloadMatchesXlsx`
- `downloadMyDataJson`

Toast copy, error mapping (`csvExportUserMessage`), and filenames are
unchanged.

### `useDashboardPolling({ t, router, refreshDashboardData, setError, setFilters })`

Encapsulates the "scrape kicked off → quietly refresh until job list
stabilises" lifecycle:

- State: `scraping`, `scrapePollActive`, `showApplyPrompt`.
- Refs: cancel ref (unmount + leave), meta ref (baseline / pollFilters
  / hasProfile / startedAt), stable counter ref (prev / ticks), toast-shown
  ref.
- Effects: unmount cleanup + the 3 s tick loop with the same 12 min cap,
  same `stableNeeded = 3`, same `minStableMs = 8000`, same scroll to
  `#dashboard-jobs`.
- Action: `triggerScrapeAll({ hasProfile, filters, jobsTotal })`.

## What is still in `page.tsx`

Kept on the page intentionally (per brief — "submitMatchFeedback in
page.tsx if risky"):

- `submitMatchFeedback` (uses `setMatches` from the data hook to remove
  a "not_relevant" item — identical behaviour, just lives where it can
  be reviewed alongside the section that uses it).
- Job-card action handlers: `applyToJob`, `trackLinkOpened`,
  `setJobApplication`, `saveJob`, `dismissJob`, `autoApplyToJob`,
  `openAutoApplyPackagePdf`.
- Application handlers: `updateApplicationStatus`, `removeApplication`,
  `saveApplicationFeedback`, `parseApplicationFeedback`.
- Placement handlers: `declarePlacement`, `startPlacementVerify`,
  `issuePlacementEmployerAttest`, `filePlacementDispute`,
  `loadPlacementEvents`.
- Calendar handlers: `connectGoogleCalendarFromDashboard`,
  `connectMicrosoftCalendarFromDashboard`,
  `subscribeDashboardWebcalOneClick`, `refreshDashboardWebcalLink`.
- `loadMoreJobs` (now uses `loadJobs` from the data hook, with the
  original dedupe-by-id merge logic preserved).
- Local UI state: modal open flags, `intelJob`, `insightsJob`,
  `employerHubJob`, `cvApp`, `negotiateApp`, `linkedinOpen`,
  `feedbackOpen`, `autoApplyingId`, `jobsLoadMoreBusy`,
  `feedbackBusy`, `placementFlowBusy`, `calendarConnectBusy`,
  `dashboardWebcalBusy`, `nextInterviewIcsBusy`.

## Did `submitMatchFeedback` behaviour change?

**No.** Same POST body, same toast key
(`dashboard.matchFeedbackSaved`), same `not_relevant` ⇒ filter-out
logic, same `setMatches` shape, same `matchFeedbackBusyJobId` flow,
same error path through `dashboardFetchUserMessage`. The setters
(`setMatchFeedbackByJobId`, `setMatchFeedbackBusyJobId`, `setMatches`,
`setError`) are now exposed by `useDashboardData` but point at the
same state slots.

## Verification

- `cd frontend && npm run lint` → 0 errors, 0 warnings.
- `cd frontend && npm run build` → green (`/dashboard` builds as a
  client page just like before).
- `cd frontend && npx tsc --noEmit` → green.
- Diff scope check: only `frontend/src/app/dashboard/page.tsx` and the
  new `frontend/src/hooks/dashboard/*.ts` files are touched. No
  backend, no env, no docs (other than this one), no API contracts.
- No e2e dashboard smoke test exists in `frontend/e2e/`; the existing
  Playwright suite (`smoke.spec.ts`) only covers public surfaces and is
  unaffected.

## Next steps (out of scope this PR)

1. Extract a `useDashboardApplicationActions` hook for the
   `updateApplicationStatus` / `removeApplication` /
   `saveApplicationFeedback` / `parseApplicationFeedback` cluster —
   they all share the same "PATCH then `loadApplications` +
   `loadDevelopmentFocus`" shape.
2. Extract a `useDashboardJobActions` hook for the
   `applyToJob` / `saveJob` / `dismissJob` / `autoApplyToJob` / track
   link cluster (similar shape, shared idempotency-key helper).
3. Consider a `useDashboardPlacementActions` hook for the 4 placement
   handlers — they all push through `setPlacementFlowBusy` and bump
   `placementEventsInvalidateKey`.
4. Extract a `useDashboardCalendarActions` hook (Google/Microsoft
   OAuth + webcal subscribe/refresh) — 4 small async functions that
   only need `setError` + the webcal URL setter.
5. When (1)–(4) land, `page.tsx` should drop into the 350–450 LoC
   range, at which point a Storybook-isolated story per section
   becomes cheap.
