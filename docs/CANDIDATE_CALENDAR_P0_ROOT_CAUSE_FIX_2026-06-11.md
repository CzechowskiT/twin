# Candidate calendar P0 root-cause fix — 2026-06-11

**Branch:** `fix/p0-candidate-calendar-root-cause-2026-06-11`  
**Owner:** TWIN Candidate Calendar P0 Root-Cause Debug

## Founder failure report

After PR #116 (reconnect banner) and PR #117 (loading timeout), founder QA still **FAIL** on `/dashboard/calendar`: indefinite **Ładowanie…**, badge **NIE POŁĄCZONO** while card body still loading, or page stuck until slow ancillary requests completed.

## Production trace (pre-fix, git `88997ad`)

| Check | Result |
|-------|--------|
| `GET /api/public-health` | `status: ok`, `db_ok: true`, `git_commit: 88997ad` — matches scaffold HEAD (no deploy mismatch) |
| `GET /api/v1/calendar/google/status` (no auth) | 401 ~0.37s |
| `GET /api/v1/calendar/microsoft/status` (no auth) | 401 ~0.39s |
| `GET /api/v1/calendar/oauth-config` | 200 ~0.51s |
| Unauthenticated browser `/dashboard/calendar` | Redirect to candidate sign-in (expected) |

## Exact root cause

**`load()` held provider phases in `Promise.all` with untimed ancillary calls.**

1. Google/Microsoft status used `timeoutMs: 9000` internally but **`setGoogleStatusPhase` / `setMicrosoftStatusPhase` ran only after entire `Promise.all` resolved**.
2. **`/api/v1/auth/me`** had **no `timeoutMs`** — hung request blocked terminal provider UI indefinitely.
3. **`fetchOpsHealth()`** used raw `fetch` with **no abort deadline** — same blocking behavior.
4. **StatusBadge** did not handle `statusPhase === "error"` — showed **NIE POŁĄCZONO** badge while body showed integration error (badge/body mismatch).
5. **No stale-request guards** — overlapping `load()` / events fetch could overwrite newer terminal state.

**Stuck state:** frontend `googleStatusPhase` / `microsoftStatusPhase` remained `"loading"` while `auth/me` or ops health hung; global `loading && !statusBootstrapComplete` showed page-level **Ładowanie statusu…** past 9s.

## Fix

### Frontend

- **`calendar/page.tsx`**
  - `loadRequestIdRef` / `eventsRequestIdRef` stale guards.
  - Provider phases set **immediately** when each status fetch completes (not after `Promise.all`).
  - `auth/me` + `fetchOpsHealth(CALENDAR_FETCH_TIMEOUT_MS)` bounded.
  - Preserve `connected: true` on transient status failure (502/504/timeout).
  - Explicit `EventsPhase` tracking via `eventsPhaseFromFlags`.
  - Optional `debugCalendarLog` when `NEXT_PUBLIC_DEBUG_CALENDAR=true`.
- **`calendar-connections-panel.tsx`** — `error` phase badge → temporary error (not false not_connected).
- **`calendar-provider-health.ts`** — `ProviderPhase`, `EventsPhase`, `502`/`504` → `temporary_error`.
- **`ops-health.ts`** — optional fetch timeout.

### Backend

- **`calendar_provider_health.py`** — Microsoft probe: missing refresh token → `reconnect_required` (parity with Google).

## State machine rules

| ProviderPhase | Events fetch | UI |
|---------------|--------------|-----|
| `not_connected` | **No** | Connect button |
| `timeout` / `temporary_error` | Only if previously connected+healthy | Retry + connect |
| `reconnect_required` | No until reconnect | Reconnect button |
| `connected` | Yes | Week view / empty |

Stale responses discarded when `requestId !== ref.current`.

## Tests

```bash
cd frontend
npm run test:candidate-calendar-p0-root-cause
npm run test:candidate-calendar-loading-state
npm run test:candidate-google-calendar-stability
npm run test:candidate-calendar-integration-health
npm run test:trust-language-guard
npx tsc --noEmit
npm run build
```

## Production smoke (post-deploy required)

1. `curl -s https://twin-sooty.vercel.app/api/public-health` — confirm new `git_commit`.
2. Authenticated `/dashboard/calendar` at 0s / 10s / 20s — terminal provider cards, no infinite loading.
3. Console: no unhandled errors; network: status endpoints ≤9s or timeout UI.

## Launch stance

**Unchanged:** public NO-GO · auto-apply PAUSED · no fake connected · no session clear on provider errors.

## Hard bans confirmed

No new features · no auth/CSP weakening · no destructive DB · no hiding errors.
