# P1 — Dashboard architecture cleanup (2026-05-26)

> Phase 1, sprint 3 follow-up to `P1_ENGINEERING_CLEANUP_2026-05-26.md`. This
> pass targets architectural debt in `frontend/src/app/dashboard/page.tsx`
> **without touching backend/API/auth/Railway/scraper/auto-apply, the
> placement state machine, the "Nietrafione" feedback mechanic, fetch / state
> management, or visible UX copy.** Pure structural refactor.

## Before

- `frontend/src/app/dashboard/page.tsx` was a single 2 246-line client
  component holding ~12 typed view-models, ~20 useState hooks, ~16 async
  handlers, **and** all the JSX for every section (calendar strip, profile +
  scrape, career compass, matches feed with apply-prompt, development focus,
  applications card, jobs card, modals).
- Sections were inlined as ~150–300 LoC JSX blocks. Adding a class or
  shipping a new feature touched the same monolith, which made review
  expensive and increased the blast radius of any change.
- Two pure helper functions (`dashboardFetchUserMessage`,
  `csvExportUserMessage`) and one date formatter (`formatInterviewRangeShort`)
  lived inline alongside types and stateful page code.

## What was extracted

All new files live under
`frontend/src/components/dashboard/` (existing folder, no route changes,
no new directories outside `components/dashboard/`).

| File                                                                   | LoC | Role                                                                                          |
| ---------------------------------------------------------------------- | --- | --------------------------------------------------------------------------------------------- |
| `dashboard-helpers.ts`                                                 | 183 | Shared types (`DashboardUser`, `DashboardProfile`, `DashboardMatchList`, …) + pure helpers     |
| `dashboard-calendar-strip.tsx`                                         | 238 | Acceptance-queue strip + Google/Microsoft connect + next interview + WebCal subscribe block    |
| `career-compass-strip.tsx`                                             |  54 | Small "configured / hint" strip linking to `/dashboard/career`                                |
| `profile-scrape-panel.tsx`                                             | 150 | "Signed in as" + profile summary + optional scrape ops sub-panel                              |
| `matches-section.tsx`                                                  | 243 | Skeleton + apply prompt + ranked feed (top + more recommendations) — preserves feedback flow  |
| `development-focus-section.tsx`                                        |  95 | Skill gaps, positioning, signals, prioritized upskill actions, roles with insights            |
| `applications-section.tsx`                                             | 121 | Summary + CSV/XLSX export buttons + `ApplicationsPanel` pass-through                          |
| `jobs-section.tsx`                                                     | 199 | Feed stats banner, filters bar, paginated job list, load more, empty states                   |
| `dashboard-modals.tsx`                                                 | 108 | Bundle of Company Intelligence / Hiring Insights / Job Employer / CV / Salary / LinkedIn      |
| **Total extracted**                                                    | **1 391** |                                                                                          |

### Page LoC

| Before (page.tsx) | After (page.tsx) | Δ            |
| ----------------- | ---------------- | ------------ |
| **2 246**         | **1 435**        | **−811 (−36 %)** |

Counted with `wc -l`.

## What was intentionally not touched

- **Fetch / state management.** All `useState`, `useCallback`, `useEffect`,
  `useRef`, `useMemo`, scrape polling, placement-verify URL handler, filter
  priming, refresh function, and toast hooks remain in `page.tsx`.
- **API calls / endpoints / auth.** No `/api/v1/…` paths touched.
- **Placement state machine + dispute flow.** `ApplicationsPanel` is wired
  through unchanged callbacks (`declarePlacement`,
  `issuePlacementEmployerAttest`, `filePlacementDispute`,
  `startPlacementVerify`, `loadPlacementEvents`).
- **"Nietrafione" / match feedback.** `submitMatchFeedback` and its busy
  state still live in `page.tsx`; `MatchesSection` only renders and
  forwards. Behavior (toast, list-trim on `not_relevant`) is identical.
- **Section order, classNames, copy.** No reordering, no CSS class
  renames, no i18n key edits.
- **React Query / SWR.** Not introduced (out of scope per task brief).
- **Route changes.** None. `/dashboard` still renders the same page.
- **`OpportunityForecast`, `ProgressDashboard`, `DashboardCommandCenter`,
  `NightlyAutoApplyStrip`, `EmailVerificationBanner`, etc.** Already lived
  in their own files — left alone.
- **`MatchCard / MatchActions`.** These responsibilities are owned by
  `JobList` (existing component), so no sub-extraction was needed inside
  `MatchesSection`.
- **`FeedFreshness` / `MarketCoverageStatus`.** Logic for the
  "today / yesterday / older" market-update label and the stale-feed
  warning lives in `JobsSection` now (was inline before). Not split into a
  micro-component to avoid 20-component fragmentation per task brief.

## Verification

- `npm run lint` → exit 0, no warnings.
- `npm run build` → success; `/dashboard` route prerenders ○.
- Existing Playwright smoke (`frontend/e2e/smoke.spec.ts`) only covers
  public routes (homepage, waitlist, login, demo) — unchanged by this
  refactor. There is no dedicated `/dashboard` smoke spec.

## Next steps

1. **Fetch / state refactor.** With sections now isolated, move data
   hooks into `useDashboardData()` / per-section custom hooks. This was
   intentionally out of scope here.
2. **React Query (or SWR).** Replace ad-hoc `useEffect` + `apiFetch` +
   manual polling for matches / applications / feed-stats with a query
   cache so the scrape polling loop in `page.tsx` can be deleted.
3. **E2E.** Add a dashboard smoke (`/dashboard` with a logged-in fixture
   user) covering the matches feed render and the placement-verify URL
   handler.
4. **Further section work.** `MatchesSection` and `JobsSection` are large
   because they hold two parallel `JobList` configurations each — could be
   collapsed once we own the data shape via a hook.
