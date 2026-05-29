# P1 Dashboard Modals Cleanup — 2026-05-26

Phase 1, frontend cleanup pass #5C. Continues the dashboard refactor
started in `28205ea` (state hooks), `0bfadc2` (section split),
`f926741` (application actions hook), and `f49c077` (calendar actions
hook). This pass moves the `<DashboardModals/>`-fed modal UI state out
of `app/dashboard/page.tsx` into a colocated `useDashboardModals` hook
without changing any user-facing behaviour (no copy, no API, no auth,
no section order, no styling, no props on `DashboardModals`).

## Why

After `f49c077` (page = 608 LoC) the only remaining cluster of
inline-only-in-`page.tsx` state was the modal UI bag fed into
`<DashboardModals/>`:

1. `intelJob` — Company Intelligence modal target.
2. `insightsJob` — Hiring Insights modal target.
3. `employerHubJob` — Job Employer hub modal target.
4. `cvApp` — CV Optimizer modal target (career compass surface).
5. `negotiateApp` — Salary Negotiation modal target.
6. `linkedinOpen` — LinkedIn Optimizer modal open flag (career compass
   surface, also entered from `ProfileScrapePanel`).

These six fields share the same shape: each holds a small "selected
item" object (or boolean) and only ever flips between `null`/`false`
and the next selection. They have zero API side-effects, zero busy
state, and zero coupling to `useDashboardData` / `useDashboardPolling`
/ `useDashboardApplicationActions` / `useDashboardCalendarActions`.
Bundling them into one hook keeps `page.tsx` focused on composition
and gives `<DashboardModals/>` a clean seam — its props stay
byte-identical.

## Scope

Hard bans (all respected):

- No backend / API / auth changes.
- No Railway / worker / scraper / auto-apply pipeline changes.
- No new features, no UX or copy changes.
- No `submitMatchFeedback` / "Nietrafione" behaviour change (still on
  the page, identical bytes).
- No job-action behaviour change (`applyToJob` / `saveJob` /
  `dismissJob` / `autoApplyToJob` / `setJobApplication` /
  `trackLinkOpened` still on the page, identical bytes).
- No `useDashboardApplicationActions` change — Phase 5A hook untouched.
- No `useDashboardCalendarActions` change — Phase 5B hook untouched.
- No `useDashboardData` core loader change.
- No `<DashboardModals/>` prop-shape change.
- No env, secrets, migrations, or deploy.
- No section order or CSS change.
- `feedbackOpen` (footer `FeedbackModal` + `DashboardTutorial`) and
  `autoApplyingId` (job-action busy lock) and `jobsLoadMoreBusy`
  (paginate busy lock) are explicitly **kept on the page** — they
  are not modal UI state for `<DashboardModals/>` and the task
  enumerated only that surface.

In scope:

- New hook
  `frontend/src/hooks/dashboard/use-dashboard-modals.ts`.
- `frontend/src/app/dashboard/page.tsx` imports + wiring only.
- This doc.

## What moved

From `page.tsx` → `use-dashboard-modals.ts`:

1. **State** — six `useState` calls, all initialised to `null` /
   `false` exactly as before:
   - `intelJob: { id; title; company; location: string | null } | null`
   - `insightsJob: { id; title } | null`
   - `employerHubJob: { id; title; company; location; url?; initialTab? } | null`
   - `cvApp: { id; title } | null`
   - `negotiateApp: { id; title } | null`
   - `linkedinOpen: boolean`
2. **Open helpers** — typed `useCallback`s with the same field
   shapes the original setters built inline:
   - `openIntel(id, title, company, location)` — `null`-tolerant
     `location` matches what `MatchesSection` / `JobsSection` already
     coerced (`location ?? null`).
   - `openInsights(id, title)`
   - `openEmployerHub(job)` — passes the full bundle through so the
     `url` / `initialTab` extra fields land on the modal verbatim.
   - `openCv(id, title)`
   - `openNegotiate(id, title)`
   - `openLinkedin()`
3. **Close helpers** — `useCallback`-stable `() => setX(null|false)`
   per modal: `closeIntel`, `closeInsights`, `closeEmployerHub`,
   `closeCv`, `closeNegotiate`, `closeLinkedin`.

Type imports moved with them:

- `JobEmployerTabId` import migrated from `page.tsx` into the hook
  (only used to type `employerHubJob.initialTab`).

`page.tsx` keeps:

- The `<DashboardModals/>` JSX call site (callbacks re-wired to call
  into `modals.*`, prop shape unchanged).
- `feedbackOpen`, `autoApplyingId`, `jobsLoadMoreBusy` — out of
  scope, see Hard bans.

## Behaviour guarantees (1:1)

Per-modal checklist:

| Modal               | State shape before                | State shape after            | Open trigger                                        | Close trigger                |
| ------------------- | --------------------------------- | ---------------------------- | --------------------------------------------------- | ---------------------------- |
| Company Intel       | `{id,title,company,location}\|null` | identical                    | `MatchesSection.onResearch`, `JobsSection.onResearch` | `DashboardModals.onCloseIntel` |
| Hiring Insights     | `{id,title}\|null`                  | identical                    | `MatchesSection.onHiringInsights`, `JobsSection.onHiringInsights` | `DashboardModals.onCloseInsights` |
| Employer Hub        | `{id,title,company,location,url?,initialTab?}\|null` | identical          | `MatchesSection.onViewEmployer`, `JobsSection.onViewEmployer` | `DashboardModals.onCloseEmployerHub` |
| CV Optimizer        | `{id,title}\|null`                  | identical                    | `ApplicationsSection.onOptimizeCv`                  | `DashboardModals.onCloseCv`  |
| Salary Negotiate    | `{id,title}\|null`                  | identical                    | `ApplicationsSection.onNegotiateSalary`             | `DashboardModals.onCloseNegotiate` |
| LinkedIn Optimizer  | `boolean`                         | identical                    | `ProfileScrapePanel.onOpenLinkedinOptimizer`        | `DashboardModals.onCloseLinkedin` |

Every default (`linkedinDefaultRole`, fallback `""`s for missing
fields, `initialTab ?? "contact"` on the `JobEmployerModal`) lives
inside `<DashboardModals/>` and is unchanged. The hook only owns the
**state container**; the modal component owns its display defaults.

## Files

- `frontend/src/hooks/dashboard/use-dashboard-modals.ts` — new. 96
  LoC. 6 `useState` machines + 12 `useCallback`-stable open/close
  helpers. Pure UI state; no `apiFetch`, no `getToken`, no `toast`.
- `frontend/src/app/dashboard/page.tsx` — drops 19 lines of `useState`
  type literals (the six modal fields plus their inline object
  shapes) and drops a top-level `JobEmployerTabId` type import. Adds
  one `useDashboardModals` import + a single `const modals =
  useDashboardModals()` line. Five inline `(id, title, ...) =>
  setX({...})` arrows in JSX collapse to bare `modals.openX`
  references. `<DashboardModals/>` block is byte-identical aside
  from callback identifiers now resolving through `modals.*`.

## Out of scope (next pass)

- Pull `loadMoreJobs` + `jobsLoadMoreBusy` into a future
  `useDashboardJobActions` hook (already flagged in
  `P1_DASHBOARD_CALENDAR_ACTIONS_2026-05-26.md`).
- Pull `submitMatchFeedback` into a matching-feedback hook only if
  the matching surface grows (still bundled with `MatchesSection`
  per `.cursorrules` "no Nietrafione behaviour change").
- Consider promoting `feedbackOpen` into its own tiny
  `useFeedbackModal` if the footer/help-widget surface grows.

## Verification

- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm run build` — clean (full Next.js production build, 85
  static + dynamic routes).
- `wc -l` page.tsx: 608 → 588 LoC (−20, −3.3%). Below the ~608
  ceiling the task set.
- Hook: 96 LoC.
- Code review: `submitMatchFeedback`, `applyToJob`, `saveJob`,
  `dismissJob`, `autoApplyToJob`, `setJobApplication`,
  `trackLinkOpened`, `loadMoreJobs`, `useDashboardData`,
  `useDashboardPolling`, `useDashboardExports`,
  `useDashboardApplicationActions`,
  `useDashboardCalendarActions`, `<DashboardModals/>` prop shape —
  all byte-identical to `f49c077` except for the JSX prop
  identifiers now resolving to `modals.*`.

No production deploy required — refactor only.
