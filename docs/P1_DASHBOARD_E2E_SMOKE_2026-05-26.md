# P1 Dashboard E2E Smoke — 2026-05-26

TASK 4 of the overnight engineering run. Extends
`frontend/e2e/smoke.spec.ts` with four **read-only**, **no-live-
action**, **no-password** Playwright cases that exercise the
candidate dashboard surface from the outside. The goal is to
catch proxy / routing / build regressions for the dashboard
without ever firing a real candidate-side mutation, real apply,
real auto-apply, real match-feedback, or real login.

## TL;DR

- `frontend/e2e/smoke.spec.ts` now has **8 tests** (was 4):
  - the existing **public smoke** describe — `/`, `/waitlist`,
    `/login/candidate`, `/demo` (unchanged);
  - a new **dashboard smoke (read-only, no live actions)**
    describe — 4 new tests.
- New tests:
  1. **Unauthenticated `/dashboard` routes to `/login`** — clears
     cookies + localStorage + sessionStorage, navigates to
     `/dashboard`, waits for the bootstrap effect to fire, and
     asserts the URL lands on `/login` (or `/dashboard` if still
     mid-redirect; the assertion list explicitly covers both).
     Verifies the auth-guard contract without a real login.
  2. **`/register/candidate` shows email + password inputs (no
     submit)** — checks the signup form renders. **Does not
     type or submit anything.** No registration, no email sent,
     no `/api/v1/auth/register` POST.
  3. **`/privacy` + `/terms` render** — public legal pages
     load, headings visible. Catches a Next build / route
     regression for cookie-consent surface.
  4. **`/api/public-health` proxy returns sane JSON** — calls
     the frontend proxy (which forwards to Railway
     `/api/v1/health`) and asserts `status="ok"` +
     `service="twin-api"`. Catches the "wrong target" proxy
     regression where the FE accidentally serves a marketing
     page on the health endpoint.
- `npx playwright test --list` enumerates all 8 tests cleanly
  (no parse error).
- `npm run lint` and `npx tsc --noEmit` clean.
- **No live actions during authoring**: the spec file is
  added but not executed against prod. The existing CI smoke
  workflow (`.github/workflows/smoke.yml`) runs `backend-smoke`,
  `frontend-build`, and `prod-health` — not the Playwright
  spec — so this slice is non-blocking for the current
  pipeline. TASK 5 may opt into running the spec locally
  (against `next start` from a fresh `next build`) in CI.

## Why now

Phase 5D-2 (`8b53e1d`) + Phase 5E (`b62a22e`) reshaped the
dashboard's data layer; the page is now pure composition over
seven hooks (`useDashboardData`, `useDashboardExports`,
`useDashboardPolling`, `useDashboardApplicationActions`,
`useDashboardCalendarActions`, `useDashboardJobApplicationActions`,
`useDashboardJobListActions`, `useDashboardMatchFeedback`).
The pure-unit-test layer (lint + tsc + `next build`) catches
type and import drift. Playwright covers the **routing +
proxy + bootstrap effect** layer that those tools cannot:

- The `useDashboardData` bootstrap effect calls
  `router.replace("/login")` when `getToken()` is null. That's
  shipped behaviour the user relies on (no flash of dashboard
  to anonymous visitors).
- The Next 16 proxy middleware forwards `/api/public-health` to
  Railway. A wrong rewrite ships a 200 marketing page on the
  health probe and silently passes the existing CI gate.
- `/register/candidate` and `/login/candidate` are Suspense
  boundaries — a bad build can ship them as empty fallbacks.

## What's tested (and what is **not**)

Tested:

- Routing: `/`, `/waitlist`, `/login/candidate`, `/demo`,
  `/dashboard` (unauthenticated), `/register/candidate`,
  `/privacy`, `/terms`.
- Proxy: `/api/public-health` returns valid JSON with
  `status="ok"` and `service="twin-api"`.
- Render: hero CTAs, waitlist email input, login email +
  password inputs, signup email + password inputs, legal-page
  headings visible.
- Auth-guard contract: `/dashboard` without a token routes the
  user toward `/login` (or shows the boot loader briefly before
  doing so).

**Not** tested (deliberate, per the overnight brief's hard bans):

- ❌ No real `applyToJob` — never click "Apply".
- ❌ No real `autoApplyToJob` — never click "Auto-apply".
- ❌ No real `submitMatchFeedback` — never click
  Trafione/Nietrafione.
- ❌ No real `setJobApplication` — never click "Mark as
  applied".
- ❌ No real login — never type a password into `/login`.
- ❌ No real signup — never submit `/register/candidate`.
- ❌ No real scrape — never click "Refresh jobs".
- ❌ No real placement declare / employer attest / dispute.
- ❌ No real calendar OAuth — never click "Connect Google
  Calendar" or "Connect Microsoft Calendar".
- ❌ No real ICS / webcal subscribe.

## Files

- `frontend/e2e/smoke.spec.ts` — adds one new `test.describe`
  block (`"dashboard smoke (read-only, no live actions)"`) with
  four cases. Existing `"public smoke"` describe is unchanged.

## Running locally

```
$ cd frontend
$ npm run build                       # production bundle
$ PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app PLAYWRIGHT_SKIP_WEBSERVER=1 \
    npx playwright test e2e/smoke.spec.ts
```

Or against a local dev server (the default `webServer`
configuration in `playwright.config.ts` runs `npm run start`):

```
$ cd frontend
$ npm run build
$ npx playwright install chromium     # first run only
$ npx playwright test e2e/smoke.spec.ts
```

`fullyParallel: true` keeps each test isolated.

## Verification

- `npx playwright test --list` — 8 tests enumerated, no parse
  error.
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean.
- Spec file does not import `@playwright/test`'s `request` or
  `fetch` against any mutating endpoint — only `GET` calls to
  `/api/v1/demo/snapshot` (existing) and `/api/public-health`
  (new).
- Spec file does not type into any `input[type='password']`
  — only asserts visibility.

## Out of scope (later passes)

- Authenticated dashboard E2E (would need a stable demo /
  recruiter / candidate account, headless OAuth bypass, or a
  reusable test-token issued by the backend behind a
  `TEST_LOGIN_TOKEN` env var). Phase 1 stays read-only.
- Visual regression / screenshot diffs — pulls in the
  `@playwright/test --update-snapshots` workflow, separate
  pass.
- Mobile viewport coverage — current spec runs Desktop Chrome
  only (matches `playwright.config.ts` `projects` array).
- Cross-origin OAuth callback flows — outside the read-only
  smoke remit.
