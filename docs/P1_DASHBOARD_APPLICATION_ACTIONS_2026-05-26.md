# P1 Dashboard Application Actions Extraction — 2026-05-26

Phase 1, frontend cleanup pass #5. Continues the dashboard refactor
started in `28205ea` (state hooks) and `0bfadc2` (section split). This
pass moves the ApplicationsPanel-related mutation handlers out of
`app/dashboard/page.tsx` into a colocated hook without changing any
user-facing behaviour (no copy, no API, no auth, no section order, no
styling).

## Why

After `28205ea` the page was 826 LoC with three distinct clusters left
inline:

1. ApplicationsPanel handlers (status / remove / feedback save / feedback
   parse / open auto-apply PDF).
2. Placement-flow handlers (declare / verify start / employer-attest /
   dispute / events load).
3. Job-card actions (apply / save / dismiss / auto-apply) and calendar
   OAuth handlers — left for follow-up passes.

The application + placement handlers all share the same shape:

- read token,
- toggle a `feedbackBusy` / `placementFlowBusy` flag,
- call a single endpoint,
- refresh `loadApplications` + `loadDevelopmentFocus` (and bump
  `placementEventsInvalidateKey` when the timeline view needs to refetch).

Extracting them keeps `page.tsx` focused on composition and gives the
ApplicationsSection its own testable seam.

## Scope

Hard bans (all respected):

- No backend / API / auth changes.
- No Railway / worker / scraper / auto-apply pipeline changes.
- No new features, no UX or copy changes.
- No `submitMatchFeedback` / `Nietrafione` behaviour change (still on the
  page, untouched).
- No job-action extraction (`applyToJob` / `saveJob` / `dismissJob` /
  `autoApplyToJob` stay on the page — that is a future pass).
- No endpoint, CSS, or section-order changes.

## LoC before / after

| File | Before | After |
| --- | ---: | ---: |
| `frontend/src/app/dashboard/page.tsx` | 826 | **659** |
| `frontend/src/hooks/dashboard/use-dashboard-application-actions.ts` | — | 286 |
| `frontend/src/hooks/dashboard/use-dashboard-data.ts` | 470 | 470 |
| `frontend/src/hooks/dashboard/use-dashboard-exports.ts` | 125 | 125 |
| `frontend/src/hooks/dashboard/use-dashboard-polling.ts` | 245 | 245 |

`page.tsx` shrank by **167 lines (−20 %)** in this pass and is now well
below the 826-LoC ceiling.

## What moved

### `useDashboardApplicationActions({ t, setError, loadApplications, loadDevelopmentFocus, syncApplicationsFromApi, setDevFocus, bumpPlacementEventsInvalidateKey })`

Owns the ApplicationsPanel mutation surface:

- State: `feedbackBusy`, `placementFlowBusy`.
- Application handlers:
  - `updateApplicationStatus(id, status)` — PATCH `/applications/:id` →
    refresh applications + dev focus.
  - `removeApplication(id)` — DELETE `/applications/:id` → refresh
    applications + dev focus.
  - `saveApplicationFeedback(id, raw)` — PATCH `recruiter_feedback_raw`
    with `feedbackBusy.kind = "save"` flag.
  - `parseApplicationFeedback(id)` — POST `/parse-feedback` with
    `feedbackBusy.kind = "parse"` flag.
  - `openAutoApplyPackagePdf(id)` — GET signed package URL, open in new
    tab; error path keeps the existing
    `dashboard.autoApplyPackagePdfFailedToast`.
- Placement handlers (all toggle `placementFlowBusy` with the
  right `kind` and bump the events-invalidate key):
  - `declarePlacement(applicationId, note)` —
    `kind: "declare"`.
  - `startPlacementVerify(applicationId, workEmail)` —
    `kind: "verify"`, keeps the existing `alert(...)` confirmation.
  - `issuePlacementEmployerAttest(applicationId, employerEmail?)` —
    `kind: "employer_attest"`, throws on no-auth so the calling modal
    can show its existing error UI, returns the attest URL, keeps the
    `placementEmployerAttestEmailed` / `…Copied` toast split.
  - `filePlacementDispute(applicationId, reason)` —
    `kind: "dispute"`.
  - `loadPlacementEvents(applicationId)` — read-only fetch used by the
    panel to populate the timeline.

All endpoints, request shapes, toast keys, error mapping
(`dashboardFetchUserMessage`), and busy-state semantics are identical to
the inline versions in `page.tsx` before this pass. The only structural
change is that the four "refresh apps + dev focus" callers go through a
small private `refreshApplicationsAndFocus(token)` helper inside the
hook to avoid repeating the two awaits.

## What is *not* touched

Per the brief these stay on the page (planned for later passes):

- Job actions: `applyToJob`, `trackLinkOpened`, `setJobApplication`,
  `saveJob`, `dismissJob`, `autoApplyToJob` — still inline in
  `page.tsx`.
- Match feedback: `submitMatchFeedback` — unchanged, still inline.
  Same POST body to `/api/v1/candidates/me/match-feedback`, same
  `dashboard.matchFeedbackSaved` toast, same `not_relevant ⇒ filter
  out` logic on `setMatches`.
- Calendar handlers: `connectGoogleCalendarFromDashboard`,
  `connectMicrosoftCalendarFromDashboard`,
  `subscribeDashboardWebcalOneClick`, `refreshDashboardWebcalLink`.
- Local UI state for modals (`intelJob`, `insightsJob`,
  `employerHubJob`, `cvApp`, `negotiateApp`, `linkedinOpen`,
  `feedbackOpen`) — they are pure render concerns.

## ApplicationsSection wiring

`ApplicationsSection` / `ApplicationsPanel` props are unchanged. The
page destructures the hook return and passes the exact same callbacks:

```tsx
const { feedbackBusy, placementFlowBusy, updateApplicationStatus, ... } =
  useDashboardApplicationActions({ t, setError, loadApplications, ... });

<ApplicationsSection
  feedbackBusy={feedbackBusy}
  placementFlowBusy={placementFlowBusy}
  onStatusChange={updateApplicationStatus}
  onRemove={removeApplication}
  onSaveFeedback={saveApplicationFeedback}
  onParseFeedback={parseApplicationFeedback}
  onPlacementDeclare={declarePlacement}
  onPlacementVerifyStart={startPlacementVerify}
  onPlacementEmployerAttest={issuePlacementEmployerAttest}
  onPlacementDispute={filePlacementDispute}
  onPlacementEventsLoad={loadPlacementEvents}
  onOpenAutoApplyPackage={openAutoApplyPackagePdf}
  /* …unchanged exports + modal-trigger props… */
/>
```

## Verification

- `cd frontend && npm run lint` → 0 errors, 0 warnings.
- `cd frontend && npx tsc --noEmit` → green.
- `cd frontend && npm run build` → green (`/dashboard` still builds as
  a client page).
- Diff scope: only `frontend/src/app/dashboard/page.tsx` is modified and
  `frontend/src/hooks/dashboard/use-dashboard-application-actions.ts` is
  added. No backend, no env, no API contracts, no other docs touched.

## Next steps (out of scope this PR)

1. Extract `useDashboardJobActions` for `applyToJob` / `saveJob` /
   `dismissJob` / `autoApplyToJob` + `trackLinkOpened` /
   `setJobApplication`. They share the idempotency-key helper and the
   same "refresh applications + dev focus" tail.
2. Extract `useDashboardCalendarActions` (Google + Microsoft OAuth
   redirects, webcal mint/refresh) — 4 small async functions that need
   only `setError` and the webcal URL setter.
3. Once (1)–(2) land, fold the local UI-state cluster
   (`intelJob` / `insightsJob` / `employerHubJob` / `cvApp` /
   `negotiateApp` / `linkedinOpen`) into a small `useDashboardModals`
   hook so `page.tsx` becomes pure composition (~350 LoC).
4. With the page that thin, add Storybook stories per section and a
   Playwright smoke for the dashboard (currently uncovered).
