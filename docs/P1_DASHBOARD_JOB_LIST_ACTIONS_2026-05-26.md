# P1 Dashboard Job List Actions — 2026-05-26

Phase 1, frontend cleanup pass #5D-1. Continues the dashboard refactor
started in `28205ea` (state hooks), `0bfadc2` (section split),
`f926741` (application actions hook), `f49c077` (calendar actions
hook), and `b35dc65` (modal state hook). This pass extracts the
**read-only / save-side** subset of the job-card mutation handlers
(bookmark, dismiss, link-open tracking, paginate-more) out of
`app/dashboard/page.tsx` into a colocated
`useDashboardJobListActions` hook without changing any user-facing
behaviour (no copy, no API, no auth, no section order, no styling,
no `<JobsSection/>` / `<MatchesSection/>` props).

## Why

After `b35dc65` (page = 588 LoC) the remaining cluster of in-page
job-card mutations split cleanly into two surfaces:

1. **Job-list / "saved jobs" surface** — `saveJob`, `dismissJob`,
   `trackLinkOpened`, `loadMoreJobs`, plus the `jobsLoadMoreBusy`
   spinner state that gates only the "load more" button. None of
   these *send* an application; they bookmark / dismiss / paginate.
2. **Apply / auto-apply surface** — `applyToJob`, `autoApplyToJob`,
   `setJobApplication`, plus the `autoApplyingId` busy lock. These
   *do* send applications and are gated separately (acknowledgement,
   PDF package open, idempotency keys) — they will move in a later
   pass once the matching-feedback / "Nietrafione" boundary is also
   re-examined.

This pass (5D-1) lifts **only** the first surface. The second surface
stays on the page byte-identical to `b35dc65`.

## Scope

Hard bans (all respected):

- No backend / API / auth changes.
- No Railway / worker / scraper / auto-apply pipeline changes.
- No new features, no UX or copy changes.
- No `submitMatchFeedback` / "Nietrafione" behaviour change (still on
  the page, identical bytes).
- **No `applyToJob` / `autoApplyToJob` / `setJobApplication` /
  `autoApplyingId` change** — all still on the page, identical
  bytes. They participate in the apply-send surface and are
  explicitly out of scope.
- No `useDashboardApplicationActions` change — Phase 5A hook
  untouched.
- No `useDashboardCalendarActions` change — Phase 5B hook untouched.
- No `useDashboardModals` change — Phase 5C hook untouched.
- No `useDashboardData` core loader change.
- No `<JobsSection/>` / `<MatchesSection/>` prop-shape change.
- No env, secrets, migrations, or deploy.
- No section order or CSS change.
- `feedbackOpen` (footer `FeedbackModal` + `DashboardTutorial`) is
  kept on the page — it is not a job-list action.

In scope:

- New hook
  `frontend/src/hooks/dashboard/use-dashboard-job-list-actions.ts`.
- `frontend/src/app/dashboard/page.tsx` imports + wiring only.
- This doc.

## What moved

From `page.tsx` → `use-dashboard-job-list-actions.ts`:

1. **State** — one `useState` call, initialised identically:
   - `jobsLoadMoreBusy: boolean` (only ever driven by `loadMoreJobs`'s
     try/finally; no other surface reads or writes it).
2. **Handlers** — four `useCallback`s with the same payloads:
   - `loadMoreJobs()` — `getToken()`-guarded paginate. Same
     short-circuits (`!token || jobs === null` → no-op,
     `items.length >= total` → no-op). Same dedup-by-`id` merge.
     Same `setJobs((prev) => ...)` shape. Same
     `dashboardFetchUserMessage` error path. Same `JOB_FEED_PAGE_MAX`
     limit constant (now imported by the hook instead of the page).
   - `trackLinkOpened(jobId)` — same `POST /api/v1/applications/`
     body `{ job_id, status: "pending", track_link_opened: true }`,
     same `Idempotency-Key` header minting (typeof-`crypto` guarded),
     same refresh chain
     (`syncApplicationsFromApi(loadApplications) →
     setDevFocus(loadDevelopmentFocus)`), same toast
     (`dashboard.applicationTrackedLinkToast`).
   - `saveJob(jobId)` — same `POST /api/v1/jobs/saved/:id`, same
     optimistic `setSavedJobIds((prev) => new Set(prev).add(jobId))`,
     same success toast (`dashboard.jobBookmarkedToast`), same
     failure path (`setError(dashboardFetchUserMessage(...))` **and**
     `toast.error(dashboard.jobBookmarkFailedToast)`).
   - `dismissJob(jobId)` — same branch logic:
     `savedJobIds.has(jobId) && !applicationByJobId[jobId]` →
     `DELETE /api/v1/jobs/saved/:id` + remove from `savedJobIds`
     + `dashboard.jobRemovedToast` (failure → `setError` +
     `dashboard.jobRemoveFailedToast`); otherwise →
     `setJobApplication(jobId, "rejected")` (kept on the page,
     injected as a callback prop).

`page.tsx` keeps:

- `setJobApplication` (banned to extract; injected into the hook so
  `dismissJob`'s "rejected" branch stays byte-identical).
- `applyToJob` (banned to extract; calls `trackLinkOpened` from the
  hook return).
- `autoApplyToJob` + `autoApplyingId` (banned to extract).
- `submitMatchFeedback` (banned to extract).
- `feedbackOpen` (footer surface; out of scope).
- `<JobsSection/>` and `<MatchesSection/>` call sites — prop bag
  unchanged. `onLoadMore`, `onApply`, `onAutoApply`, `onSave`,
  `onDismiss` resolve to the same handlers, only some of which now
  come from the hook destructure.

## Behaviour guarantees (1:1)

Per-handler checklist:

| Handler             | Endpoint                                  | Method  | Body / headers                                                                 | Refresh chain                                                | Toast (success)                                  | Error path                                                                 |
| ------------------- | ----------------------------------------- | ------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------- |
| `saveJob`           | `/api/v1/jobs/saved/:id`                  | `POST`  | none                                                                           | local: `setSavedJobIds.add(id)`                              | `dashboard.jobBookmarkedToast`                   | `setError(dashboardFetchUserMessage)` + `toast.error(dashboard.jobBookmarkFailedToast)` |
| `dismissJob` (saved-only) | `/api/v1/jobs/saved/:id`            | `DELETE`| none                                                                           | local: `setSavedJobIds.delete(id)`                           | `dashboard.jobRemovedToast`                      | `setError(dashboardFetchUserMessage)` + `toast.error(dashboard.jobRemoveFailedToast)` |
| `dismissJob` (otherwise)  | (delegates to `setJobApplication`)  | —       | —                                                                              | —                                                            | —                                                | —                                                                          |
| `trackLinkOpened`   | `/api/v1/applications/`                   | `POST`  | `{ job_id, status: "pending", track_link_opened: true }`, optional `Idempotency-Key` | `syncApplicationsFromApi(loadApplications) → setDevFocus(loadDevelopmentFocus)` | `dashboard.applicationTrackedLinkToast`          | `setError(dashboardFetchUserMessage)`                                       |
| `loadMoreJobs`      | `/api/v1/jobs/?...` (via `loadJobs`)      | `GET`   | `{ skip: items.length, limit: JOB_FEED_PAGE_MAX }`                              | `setJobs((prev) => dedup-merge(prev, page))`                 | (none)                                           | `setError(dashboardFetchUserMessage)`                                       |

Every i18n key, every payload field name, every request method, every
`Idempotency-Key` minting branch, every short-circuit (`!token`,
`jobs === null`, `items.length >= total`, `savedJobIds.has(jobId) &&
!statusForJob`) is byte-for-byte identical to `b35dc65`.

## Apply / auto-apply / Nietrafione — explicitly untouched

Confirmed unchanged on the page (diff against `b35dc65`):

- `applyToJob(jobId, url)` — still calls
  `window.open(url, "_blank", "noopener,noreferrer")` and then
  `void trackLinkOpened(jobId)`. The only change is that
  `trackLinkOpened` now comes from the hook destructure; payload
  and side effects are identical.
- `autoApplyToJob(jobId)` — still on the page, byte-identical.
  Same `POST /api/v1/applications/auto-apply` body
  `{ job_id, human_acknowledged: true }`, same
  `autoApplyingId` busy lock, same `result.message` toast, same
  `result.package_pdf_url` follow-up `window.open`.
- `setJobApplication(jobId, status)` — still on the page,
  byte-identical. Same endpoint, same `Idempotency-Key` minting,
  same refresh chain, same `applied`-only toast.
- `submitMatchFeedback(jobId, value)` / "Nietrafione" — still on
  the page, byte-identical. No matching-feedback wiring change.

## Files

- `frontend/src/hooks/dashboard/use-dashboard-job-list-actions.ts`
  — new, 217 LoC. One `useState` (jobsLoadMoreBusy) + four
  `useCallback` handlers (loadMoreJobs, trackLinkOpened, saveJob,
  dismissJob). Imports `apiFetch`, `getToken`, `dashboardFetchUserMessage`,
  `JOB_FEED_PAGE_MAX`, `JobFilters`, `DashboardJobList`,
  `DevelopmentFocus`, `ApplicationRow`. Pure data-layer; no JSX.
- `frontend/src/app/dashboard/page.tsx` — drops 4 inline function
  declarations (`loadMoreJobs`, `trackLinkOpened`, `saveJob`,
  `dismissJob`) and one `useState<boolean>` (`jobsLoadMoreBusy`).
  Drops `JOB_FEED_PAGE_MAX` import (now owned by the hook). Adds
  one `useDashboardJobListActions` import + a single destructuring
  call that injects the page's `setJobApplication` reference so
  `dismissJob`'s "rejected" branch stays identical. `<JobsSection/>`
  and `<MatchesSection/>` prop bags are byte-identical aside from
  identifier resolution.

## LoC

| File                                                                   | Before (`b35dc65`) | After      | Δ     |
| ---------------------------------------------------------------------- | ------------------ | ---------- | ----- |
| `frontend/src/app/dashboard/page.tsx`                                  | 588                | 514        | −74   |
| `frontend/src/hooks/dashboard/use-dashboard-job-list-actions.ts`       | (n/a, new)         | 217        | +217  |
| **Total touched**                                                      | **588**            | **731**    | +143  |

`page.tsx` is now well below the ~588 LoC ceiling the task set
(−12.6%). The hook itself is larger than the lines it deletes from
`page.tsx` because it carries its own `"use client"`, imports, prop
interface, JSDoc, and `useCallback` boilerplate — that's the
expected tradeoff for the boundary (`page.tsx` is "composition only"
and easier to read end-to-end).

## Out of scope (Phase 5D-2 and later)

- Pull `applyToJob` + `autoApplyToJob` + `setJobApplication` +
  `autoApplyingId` into a future
  `useDashboardJobApplicationActions` hook. This is the next
  natural slice — it owns the "send an application" surface and
  must keep `setJobApplication` available to the saved-jobs hook
  via injection (same pattern this pass uses for `dismissJob`).
- Pull `submitMatchFeedback` into a matching-feedback hook only if
  the matching surface grows (still bundled with `MatchesSection`
  per `.cursorrules` "no Nietrafione behaviour change").
- Consider promoting `feedbackOpen` into its own tiny
  `useFeedbackModal` if the footer / help-widget surface grows.

## Verification

- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm run build` — clean (full Next.js production build).
- `wc -l` page.tsx: 588 → 514 LoC (−74, −12.6%). Below the ~588
  ceiling the task set.
- Hook: 217 LoC.
- Code review: `setJobApplication`, `applyToJob`, `autoApplyToJob`,
  `submitMatchFeedback`, `autoApplyingId`, `useDashboardData`,
  `useDashboardPolling`, `useDashboardExports`,
  `useDashboardApplicationActions`,
  `useDashboardCalendarActions`, `useDashboardModals`,
  `<DashboardModals/>` / `<JobsSection/>` / `<MatchesSection/>`
  prop shape — all byte-identical to `b35dc65` aside from
  destructured identifiers resolving through the new hook.

No production deploy required — refactor only. The change is
client-only and additive (new hook file); if the next deploy
includes other commits, this slice does not require any new
environment variable, migration, or backend rebuild. Safe to ship
on the next regular `vercel deploy --prod` or via the existing
Vercel Git integration on `cursor/phase1-monorepo-scaffold` →
preview, then promote to production with the standard "Promote to
Production" button.
