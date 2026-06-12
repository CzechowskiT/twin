# Candidate calendar integration incident — 2026-06-11

**Branch:** `fix/p0-candidate-calendar-integration-incident-2026-06-11`  
**Owner:** TWIN Candidate Calendar Incident Owner  
**Status:** Fix shipped in branch — **NOT demo-ready** until founder PASS on production

## Founder failure report

Screenshot terminal state (authenticated `/dashboard/calendar`):

- Google connected: `myczechowscy@gmail.com`
- Microsoft connected: `czechowski@protonmail.ch`
- **Both provider cards:** badge **BŁĄD INTEGRACJI** (`calendarIntegrationError`)
- **Week panel:** *„Akcja kalendarza nie powiodła się. Spróbuj odłączyć i połączyć ponownie.”* (`calendarErrorGeneric`)
- User should **not** be asked to disconnect/reconnect when connections are valid and only events read failed

PR #116–118 fixed infinite loading / reconnect banner mismatch but **did not** decouple connection status from events-read failures.

## Step 1 — Production trace (2026-06-11)

| Check | Result |
|-------|--------|
| Browser `GET /dashboard/calendar` (unauthenticated) | Public chrome / login links — no calendar dashboard (expected; no safe founder creds in repo) |
| `GET /api/public-health` | **429 rate limited** (~0.27s) — could not read `git_commit` |
| `GET /api/v1/calendar/google/status` | **429** (~0.25s) |
| `GET /api/v1/calendar/microsoft/status` | **429** (~0.25s) |
| `GET /api/v1/calendar/oauth-config` | **429** (~0.25s) |
| `GET twin-production…/api/v1/health?ops=1&db=1` | **Timeout / no response** within 135s |
| Browser console on calendar URL | No app errors; CursorBrowser dialog override warning only |
| Browser network (unauth landing) | `GET /api/v1/health?ops=1` → 429; static assets 200 |

**Limitation:** Automated trace could not capture authenticated provider status/events bodies or Railway ops health due to edge rate limits and backend hang. Root cause confirmed via code path + deterministic regression tests.

## Step 2 — Backend diagnostics (calendar surfaces)

| Endpoint | Caller | Shape | External API | Timeout | Auth/temp failure |
|----------|--------|-------|--------------|---------|-------------------|
| `GET /api/v1/calendar/google/status` | `page.tsx` `loadGoogleStatus` | `CalendarStatusOut` | Token probe / refresh | 9s (`CALENDAR_FETCH_TIMEOUT_MS`) | 428 reconnect; 503 temporary; preserve session |
| `GET /api/v1/calendar/microsoft/status` | `page.tsx` `loadMicrosoftStatus` | same | Token probe / refresh | 9s | same |
| `GET /api/v1/calendar/oauth-config` | `load()` ancillary | OAuth redirect URIs | none | 9s | null on failure |
| `GET /api/v1/calendar/{google\|microsoft}/events` | `fetchCalendarWeekEvents` | `{ events[] }` | Google Calendar API / MS Graph calendarView | 9s | 428 auth; 503 temp; 502 generic list fail; **422 unsupported MS personal** (new) |
| `POST /api/v1/calendar/{prov}/freebusy` | `runFreeBusy` | busy blocks | provider API | default apiFetch | action error banner only |
| `POST /api/v1/calendar/google/events` | `createTestBlock` | event id | Google insert | default | action only |
| `GET /api/v1/calendar/{prov}/slots*` | scheduling UI | slots | provider | default | action only |
| `POST /api/v1/calendar/{prov}/interviews` | `saveInterview` | interview row | provider write | default | action only |
| `GET /api/v1/calendar/me/interviews` | `fetchInterviewRows` | TWIN interviews | DB | default | independent |
| `GET /api/v1/health?ops=1` | `fetchOpsHealth` | ops flags | env wiring | 9s | null, non-blocking |

### Root causes tested (mission 1–10)

| # | Hypothesis | Verdict |
|---|------------|---------|
| 1 | Token refresh failure marks both providers | **Partial** — independent status fetches; bug was frontend merge |
| 2 | Scope / insufficient consent | Handled → `reconnect_required` per provider |
| 3 | Protonmail Microsoft personal mailbox | **Likely** — token OK, calendar API fails; now 422 + UI copy |
| 4 | One provider failure marks both cards | **Confirmed bug** — `displayHealthForProvider` merged events `error` into both badges |
| 5 | Action vs read errors conflated | **Confirmed** — week panel used action copy for events `loadError` |
| 6 | Duplicate OAuth rows | `get_best_*_row` uses latest `updated_at` |
| 7 | Proxy mismatch | 502/504 classified as `temporary_error` |
| 8 | Status hang (PR #117) | Already fixed — phases independent |
| 9 | Session clear on 428 | Already fixed — `preserveSessionOnUnauthorized` |
| 10 | Events auth failure | Correctly escalates **only** that provider card to reconnect |

**Exact root cause:** Frontend treated **events-read failures** (502/504/timeout) as **connection integration errors** on provider cards via `healthAfterWeekFetch` → `displayHealthForProvider`, and surfaced **disconnect/reconnect** copy in the week panel and action banner.

## Step 3 — Fix summary

### Architecture

- **Provider card badge:** `connectionHealthForProvider()` — status endpoint + events auth failure only
- **Week panel:** `eventsPhase` / `loadError` — `calendarEventsReadError` + retry (WebCal safe degraded)
- **Action/write:** `calendarActionFailedRetry` — no disconnect loop
- **Diagnostics:** `CalendarOperationDiagnostic` + `logCalendarOperationDiagnostic` (no PII)

### Copy (PL/EN)

| Key | Purpose |
|-----|---------|
| `calendarEventsReadError` | Week events read failure |
| `calendarEventsReadRetryHint` | Connections stay active; WebCal fallback |
| `calendarActionFailedRetry` | Generic action failure |
| `calendarConnectionProbeError` | Status probe `health: error` |
| `calendarMicrosoftUnsupportedAccount` | Personal MS mailbox |
| `calendarErrorGeneric` | OAuth callback unknown only (no disconnect) |

### Files touched

- `frontend/src/lib/calendar-provider-health.ts`
- `frontend/src/app/dashboard/calendar/page.tsx`
- `frontend/src/components/calendar/calendar-connections-panel.tsx`
- `frontend/src/components/calendar/calendar-week-view.tsx`
- `frontend/src/lib/i18n.ts`
- `frontend/scripts/candidate-calendar-incident.test.ts`
- `backend/app/services/calendar_provider_health.py`
- `backend/app/api/calendar_microsoft.py`

## Step 4 — Tests

```bash
cd frontend
npm run test:candidate-calendar-incident          # 10/10
npm run test:candidate-calendar-integration-health
npm run test:candidate-calendar-p0-root-cause
npm run test:candidate-calendar-loading-state
npm run test:candidate-google-calendar-stability
npm run test:trust-language-guard
npx tsc --noEmit
npm run build
```

## Step 5 — Launch stance

**Calendar: NOT demo-ready** until founder confirms PASS on production with both providers connected.

Hard bans confirmed: no reconnect loop · no session clear · no fake connected · no auth/CSP weakening · no destructive DB.

## Step 6 — Production proof (post-deploy checklist)

1. `curl -s https://twin-sooty.vercel.app/api/public-health` — note `git_commit` matches merge SHA
2. Authenticated `/dashboard/calendar` — cards **POŁĄCZONO** when status `health: ok`; events 502 → week retry panel only
3. Microsoft personal account → unsupported copy or partial week warning; Google card unaffected
4. `NEXT_PUBLIC_DEBUG_CALENDAR=true` — `[calendar-debug] operation_diagnostic` lines without emails/tokens

**Pre-deploy verdict:** **FAIL** (founder state still on old deploy; trace blocked by 429)  
**Expected post-deploy:** **DEGRADED BUT SAFE** if events upstream flaky; **PASS** if both providers return events

## Follow-up — week events loading hang (2026-06-12)

After integration-incident fixes, founder reports provider cards **POŁĄCZONO** but week panel stuck on **„Ładowanie wydarzeń…”**. Root cause: `useEffect` refetch loop from unstable snapshot deps + stale requests skipping `eventsLoading=false`. See `docs/CANDIDATE_CALENDAR_WEEK_EVENTS_LOADING_FIX_2026-06-12.md`.
