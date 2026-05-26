# P1 Dashboard Job Application Actions — 2026-05-26

Phase 1, frontend cleanup pass **5D-2**. Continues the dashboard
refactor started in `28205ea` (state hooks), `0bfadc2` (section
split), `f926741` (application actions hook), `f49c077` (calendar
actions hook), `b35dc65` (modal state hook), and `564f032` (job list
actions hook). This pass extracts the **"send an application"**
surface — `applyToJob`, `autoApplyToJob`, `setJobApplication`, plus
the `autoApplyingId` busy lock — out of
`app/dashboard/page.tsx` into a colocated
`useDashboardJobApplicationActions` hook without changing any
user-facing behaviour (no copy, no API, no auth, no section order,
no styling, no `<JobsSection/>` / `<MatchesSection/>` prop shape, no
`submitMatchFeedback`).

## Why

Pass 5D-1 (`564f032`) explicitly carved out the **read-only / save-
side** subset of job-card mutations (bookmark, dismiss, link-open
tracking, paginate-more) and left the "send an application" surface
on the page. The "Out of scope" section of
`docs/P1_DASHBOARD_JOB_LIST_ACTIONS_2026-05-26.md` named the next
slice:

> Pull `applyToJob` + `autoApplyToJob` + `setJobApplication` +
> `autoApplyingId` into a future `useDashboardJobApplicationActions`
> hook. This is the next natural slice — it owns the "send an
> application" surface and must keep `setJobApplication` available
> to the saved-jobs hook via injection (same pattern this pass uses
> for `dismissJob`).

This pass (5D-2) does exactly that.

## Scope

Hard bans (all respected):

- No backend / API / auth changes.
- No Railway / worker / scraper / auto-apply pipeline changes.
- No new features, no UX or copy changes.
- No `submitMatchFeedback` / "Nietrafione" behaviour change (still
  on the page, identical bytes).
- No `useDashboardApplicationActions` change — Phase 5A hook
  untouched.
- No `useDashboardCalendarActions` change — Phase 5B hook untouched.
- No `useDashboardModals` change — Phase 5C hook untouched.
- No `useDashboardJobListActions` change — Phase 5D-1 hook
  untouched (only its caller is rewired to read
  `setJobApplication` from the new hook instead of an in-page
  function declaration).
- No `useDashboardData` core loader change.
- No `<JobsSection/>` / `<MatchesSection/>` prop-shape change.
- No env, secrets, migrations, or deploy.
- No real-application sending in tests / smoke (no test changes
  here; the hook is plain TypeScript with no test runner wired in
  by this pass).
- No section order or CSS change.

In scope:

- New hook
  `frontend/src/hooks/dashboard/use-dashboard-job-application-actions.ts`.
- `frontend/src/app/dashboard/page.tsx` imports + wiring only.
- This doc.

## What moved

From `page.tsx` → `use-dashboard-job-application-actions.ts`:

1. **State** — one `useState` call, initialised identically:
   - `autoApplyingId: number | null` (only ever driven by
     `autoApplyToJob`'s try/finally; the `<MatchesSection/>` and
     `<JobsSection/>` consumers read it through `autoApplyingId` to
     paint the per-card spinner).
2. **Handlers** — three callbacks with the same payloads:
   - `setJobApplication(jobId, status)` — same
     `POST /api/v1/applications/` body `{ job_id, status }`, same
     `Idempotency-Key` header minting (typeof-`crypto` guarded),
     same refresh chain
     (`syncApplicationsFromApi(loadApplications) →
     setDevFocus(loadDevelopmentFocus)`), same `applied`-only
     success toast (`dashboard.applicationTrackedAppliedToast`),
     same error path (`setError(dashboardFetchUserMessage(...))`).
     Still exposed to `useDashboardJobListActions` as the
     `setJobApplication` callback prop so `dismissJob`'s "rejected"
     branch stays byte-identical.
   - `applyToJob(jobId, url)` — same
     `window.open(url, "_blank", "noopener,noreferrer")` followed
     by `void trackLinkOpened(jobId)`. `trackLinkOpened` comes
     from `useDashboardJobListActions` and is injected through a
     `trackLinkOpenedRef` (see "Hook-order cycle" below).
   - `autoApplyToJob(jobId)` — same
     `POST /api/v1/applications/auto-apply` body
     `{ job_id, human_acknowledged: true }`, same
     `autoApplyingId` busy lock (set → request → finally clear),
     same `result.message` toast, same `result.package_pdf_url`
     follow-up `window.open(..., "_blank", "noopener,noreferrer")`,
     same refresh chain, same `setError(null)` pre-clear, same
     `dashboardFetchUserMessage` error path.

`page.tsx` keeps:

- `submitMatchFeedback` (banned to extract; still on the page,
  identical bytes).
- `feedbackOpen` (footer surface; out of scope).
- `<JobsSection/>` and `<MatchesSection/>` call sites — prop bag
  unchanged. `autoApplyingId`, `onApply`, `onAutoApply` resolve to
  the same identifiers, only now they come from the new hook
  destructure.

## Hook-order cycle — resolved via ref

The two job-card hooks have a mutual dependency:

- `useDashboardJobApplicationActions.applyToJob` needs
  `trackLinkOpened` (from `useDashboardJobListActions`).
- `useDashboardJobListActions.dismissJob` (its "rejected" branch)
  needs `setJobApplication` (from
  `useDashboardJobApplicationActions`).

React hooks must be called in a stable order, so one must come
first. We resolve this with a single `useRef`:

```ts
const trackLinkOpenedRef = useRef<((jobId: number) => void | Promise<void>) | null>(null);

const { setJobApplication, applyToJob, autoApplyToJob, autoApplyingId } =
  useDashboardJobApplicationActions({ ..., trackLinkOpenedRef });

const { trackLinkOpened, saveJob, dismissJob, jobsLoadMoreBusy, loadMoreJobs } =
  useDashboardJobListActions({ ..., setJobApplication });

useEffect(() => {
  trackLinkOpenedRef.current = trackLinkOpened;
}, [trackLinkOpened]);
```

`applyToJob` calls `trackLinkOpenedRef.current(jobId)`. The
`useEffect` keeps the ref pointed at the latest `trackLinkOpened`
identity. In practice `trackLinkOpened` is a stable
`useCallback`, so the ref re-write is rare; even on a re-write the
underlying request and toast behaviour are identical bytes to the
original in-page function.

This pattern matches the existing convention used for
`setJobApplication` injection (`useDashboardJobListActions` already
accepts it as a callback prop) and avoids lifting either hook's
state up another level.

## Behaviour guarantees (1:1)

Per-handler checklist:

| Handler                  | Endpoint                           | Method | Body / headers                                                                                | Refresh chain                                                                          | Toast (success)                              | Error path                                              |
| ------------------------ | ---------------------------------- | ------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| `setJobApplication`      | `/api/v1/applications/`            | `POST` | `{ job_id, status }`, optional `Idempotency-Key`                                              | `syncApplicationsFromApi(loadApplications) → setDevFocus(loadDevelopmentFocus)`        | `dashboard.applicationTrackedAppliedToast` (only when `status === "applied"`) | `setError(dashboardFetchUserMessage)`                  |
| `applyToJob`             | (delegates to `trackLinkOpened`)   | —      | `window.open(url, "_blank", "noopener,noreferrer")` first, then `void trackLinkOpened(jobId)` | (via `trackLinkOpened`: same chain as 5D-1)                                            | (none from `applyToJob`; toast lives in `trackLinkOpened`) | (via `trackLinkOpened`)                              |
| `autoApplyToJob`         | `/api/v1/applications/auto-apply`  | `POST` | `{ job_id, human_acknowledged: true }`                                                        | `syncApplicationsFromApi(loadApplications) → setDevFocus(loadDevelopmentFocus)`        | `result.message` from the API response       | `setError(dashboardFetchUserMessage)`; busy cleared in `finally` |
| `autoApplyToJob` (PDF)   | (`result.package_pdf_url`, if set) | —      | `window.open(result.package_pdf_url, "_blank", "noopener,noreferrer")`                        | —                                                                                      | —                                            | —                                                       |

Every i18n key, every payload field name, every request method,
every `Idempotency-Key` minting branch, every `window.open` flag
set, every short-circuit (`!token`, optional
`package_pdf_url`), every busy-state transition (`setError(null)`
pre-clear and `finally setAutoApplyingId(null)`) is
byte-for-byte identical to `564f032`.

## Files

- `frontend/src/hooks/dashboard/use-dashboard-job-application-actions.ts`
  — new, 178 LoC. One `useState` (`autoApplyingId`) + three
  `useCallback`s (`setJobApplication`, `applyToJob`,
  `autoApplyToJob`). Imports `apiFetch`, `getToken`,
  `dashboardFetchUserMessage`, `DevelopmentFocus`,
  `ApplicationRow`, `TranslationKey`. Pure data-layer; no JSX.
- `frontend/src/app/dashboard/page.tsx` — drops 3 inline function
  declarations (`setJobApplication`, `applyToJob`,
  `autoApplyToJob`) and one `useState<number | null>`
  (`autoApplyingId`). Adds:
  - one `useDashboardJobApplicationActions` import + destructure
  - a single `useRef` (`trackLinkOpenedRef`) + a single
    `useEffect` to keep the ref pointed at the current
    `trackLinkOpened`
  - one extra `useEffect` import from React
  
  `<JobsSection/>` and `<MatchesSection/>` prop bags are
  byte-identical aside from identifier resolution.

## LoC

| File                                                                          | Before (`564f032`) | After  | Δ    |
| ----------------------------------------------------------------------------- | ------------------ | ------ | ---- |
| `frontend/src/app/dashboard/page.tsx`                                         | 514                | 473    | −41  |
| `frontend/src/hooks/dashboard/use-dashboard-job-application-actions.ts`       | (n/a, new)         | 178    | +178 |
| **Total touched**                                                             | **514**            | **651** | +137 |

`page.tsx` is now well below the ~514 LoC ceiling the task set
(−8.0%). The hook itself is larger than the lines it deletes from
`page.tsx` because it carries its own `"use client"`, imports, prop
interface, JSDoc, and `useCallback` boilerplate — that's the
expected tradeoff for the boundary (`page.tsx` is "composition
only" and easier to read end-to-end).

## Out of scope (later passes)

- Pull `submitMatchFeedback` into a matching-feedback hook only if
  the matching surface grows (still bundled with `MatchesSection`
  per `.cursorrules` "no Nietrafione behaviour change").
- Consider promoting `feedbackOpen` into its own tiny
  `useFeedbackModal` if the footer / help-widget surface grows.

## Verification

- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm run build` — clean (full Next.js production build).
- `wc -l` page.tsx: 514 → 473 LoC (−41, −8.0%). Below the ~514
  ceiling the task set.
- Hook: 178 LoC.
- Code review: `submitMatchFeedback`, `feedbackOpen`,
  `useDashboardData`, `useDashboardPolling`, `useDashboardExports`,
  `useDashboardApplicationActions`,
  `useDashboardCalendarActions`, `useDashboardModals`,
  `useDashboardJobListActions`, `<DashboardModals/>` /
  `<JobsSection/>` / `<MatchesSection/>` prop shape — all
  byte-identical to `564f032` aside from destructured identifiers
  resolving through the new hook.
- No real applications fired during verification — only lint, tsc,
  and Next build (purely static type / route checks; the auto-apply
  endpoint was never called).

No production deploy required — refactor only. The change is
client-only and additive (new hook file); if the next deploy
includes other commits, this slice does not require any new
environment variable, migration, or backend rebuild. Safe to ship
on the next regular `vercel deploy --prod` or via the existing
Vercel Git integration on `cursor/phase1-monorepo-scaffold` →
preview, then promote to production with the standard "Promote to
Production" button.
