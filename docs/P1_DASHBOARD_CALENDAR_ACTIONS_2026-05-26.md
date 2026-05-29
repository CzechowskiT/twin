# P1 Dashboard Calendar Actions Extraction — 2026-05-26

Phase 1, frontend cleanup pass #5B. Continues the dashboard refactor
started in `28205ea` (state hooks), `0bfadc2` (section split), and
`f926741` (application actions hook). This pass moves the
`DashboardCalendarStrip`-related handlers out of
`app/dashboard/page.tsx` into a colocated hook without changing any
user-facing behaviour (no copy, no API, no auth, no section order, no
styling).

## Why

After `f926741` (page = 659 LoC) three local handler clusters were
still inline:

1. Calendar handlers (Google connect / Microsoft connect / WebCal
   subscribe / WebCal refresh) plus their busy state machines
   (`calendarConnectBusy`, `dashboardWebcalBusy`, `nextInterviewIcsBusy`).
2. Job-card actions (apply / save / dismiss / auto-apply) — left for a
   follow-up pass.
3. `submitMatchFeedback` — explicitly out of scope per `.cursorrules`
   matching surface.

The calendar handlers all share the same shape:

- read token,
- toggle a `calendarConnectBusy` / `dashboardWebcalBusy` flag,
- call a single endpoint (`/api/v1/calendar/{google,microsoft}/authorize`)
  or a WebCal helper (`mintAndOpenWebcalSubscribe` / `mintWebcalFeed` +
  `persistWebcalUrl`),
- redirect via `window.location.href` (OAuth) or write the freshly
  minted URL back to `dashboardWebcalUrl` via the data hook setter.

Extracting them keeps `page.tsx` focused on composition and gives the
`DashboardCalendarStrip` its own testable seam.

## Scope

Hard bans (all respected):

- No backend / API / auth changes.
- No Railway / worker / scraper / auto-apply pipeline changes.
- No new features, no UX or copy changes.
- No `submitMatchFeedback` / "Nietrafione" behaviour change (still on
  the page, identical bytes).
- No job-action behaviour change (`applyToJob` / `saveJob` /
  `dismissJob` / `autoApplyToJob` still on the page, identical bytes).
- No `useDashboardApplicationActions` change — Phase 5A hook untouched.
- No `DashboardCalendarStrip` UI/JSX change — only callback wiring.
- No env, secrets, migrations, or deploy.
- No section order or CSS change.

In scope:

- New hook
  `frontend/src/hooks/dashboard/use-dashboard-calendar-actions.ts`.
- `frontend/src/app/dashboard/page.tsx` imports + wiring only.
- This doc.

## What moved

From `page.tsx` → `use-dashboard-calendar-actions.ts`:

1. `connectGoogleCalendarFromDashboard` — POST
   `/api/v1/calendar/google/authorize`, `window.location.href =
   res.authorize_url`. Same `calendarConnectBusy = "google"` gating,
   same `dashboardFetchUserMessage` error mapping.
2. `connectMicrosoftCalendarFromDashboard` — POST
   `/api/v1/calendar/microsoft/authorize`, identical redirect /
   `calendarConnectBusy = "microsoft"` semantics.
3. `subscribeDashboardWebcalOneClick` — wraps `mintAndOpenWebcalSubscribe`
   (which itself does the mint + WebCal opener). On success writes
   `setDashboardWebcalUrl(out.webcal_url)`. Busy via `dashboardWebcalBusy`.
4. `refreshDashboardWebcalLink` — wraps `mintWebcalFeed`, writes
   `setDashboardWebcalUrl` and persists with `persistWebcalUrl`. Busy
   via `dashboardWebcalBusy`.

State machines moved with them:

- `calendarConnectBusy: "google" | "microsoft" | null`.
- `dashboardWebcalBusy: boolean`.
- `nextInterviewIcsBusy: boolean` (the strip drives the ICS download
  internally and only consults `nextInterviewIcsBusy` +
  `setNextInterviewIcsBusy` for its spinner state — both are surfaced
  verbatim from the hook).

Imports moved with them:

- `mintAndOpenWebcalSubscribe`, `mintWebcalFeed`, `persistWebcalUrl`
  from `@/lib/webcal-subscribe`.

`page.tsx` keeps:

- `dashboardWebcalUrl` / `setDashboardWebcalUrl` (still owned by
  `useDashboardData`; injected into the calendar hook as a setter).
- `DashboardCalendarStrip` JSX (props re-wired to call into
  `calendarActions.*`).

## Behaviour guarantees (1:1)

Per-action checklist:

| Aspect              | Before                                       | After                              |
| ------------------- | -------------------------------------------- | ---------------------------------- |
| Endpoints           | `/calendar/{google,microsoft}/authorize`     | identical                          |
| Payloads            | empty body (GET-style POST via `apiFetch`)   | identical                          |
| Redirect target     | `window.location.href = res.authorize_url`   | identical                          |
| WebCal mint         | `mintAndOpenWebcalSubscribe` + persist       | identical (`persist` only on refresh) |
| WebCal refresh      | `mintWebcalFeed` + `persistWebcalUrl`        | identical                          |
| Busy flags          | `calendarConnectBusy`, `dashboardWebcalBusy` | identical (hooked state)           |
| ICS spinner         | `nextInterviewIcsBusy` (page-owned)          | identical (hook-owned, same setter signature) |
| Error UX            | `setError(dashboardFetchUserMessage(err, t))` | identical                          |
| Toasts              | none                                         | none (matches pre-extract)         |
| Section order / CSS | unchanged                                    | unchanged                          |

## Files

- `frontend/src/hooks/dashboard/use-dashboard-calendar-actions.ts` —
  new. 4 handlers + 3 useState machines. `useCallback`-stable
  references so the strip props are referentially stable across
  re-renders.
- `frontend/src/app/dashboard/page.tsx` — drops 4 inline `async
  function` declarations, drops 3 `useState` calls, drops 3 webcal
  imports. Adds `useDashboardCalendarActions` import + destructure.
  `DashboardCalendarStrip` JSX block is byte-identical aside from
  callback identifiers now resolving through the hook.

## Out of scope (next pass)

- Move job-card handlers (`applyToJob` / `saveJob` / `dismissJob` /
  `autoApplyToJob`, plus `setJobApplication` / `trackLinkOpened`
  helpers) into `useDashboardJobActions`.
- Move `submitMatchFeedback` into a hook only if matching becomes its
  own surface (currently bundled with `MatchesSection` callbacks; keep
  inline per `.cursorrules` "no Nietrafione behaviour change").
- Move `loadMoreJobs` + `jobsLoadMoreBusy` into the same future
  job-actions hook.

## Verification

- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- `npm run build` — clean.
- `wc -l` page.tsx: 659 → 608 LoC (-51, -7.7%).
- Hook: 121 LoC.
- Code review: `submitMatchFeedback`, `applyToJob`, `saveJob`,
  `dismissJob`, `autoApplyToJob`, `useDashboardApplicationActions`,
  `DashboardCalendarStrip` JSX — all byte-identical to `f926741`
  except for the prop identifiers resolving to the new hook.

No production deploy required — refactor only.
