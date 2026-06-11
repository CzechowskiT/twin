# Candidate calendar loading state timeout fix — 2026-06-11

**Branch:** `fix/candidate-calendar-loading-state-timeout-2026-06-11`  
**Owner:** TWIN Candidate Calendar Loading State Recovery

## Problem (P0/P1)

On `/dashboard/calendar`, the page could stay on **Ładowanie…** indefinitely: provider badges showed **NIE POŁĄCZONO** while card bodies still showed loading, with no retry or connect action.

PR #116 fixed reconnect banner vs badge mismatch; loading UX remained broken when status or events fetches hung.

## Root cause

| # | Cause |
|---|--------|
| 1 | **No client timeout** — `apiFetch` had no `AbortController` deadline; hung proxy/API left global `loading` true forever. |
| 2 | **Global loading gate** — one shared `loading` boolean drove page hero, week view, and both provider cards. |
| 3 | **Badge/body mismatch** — before status resolved, `connected: false` rendered **NIE POŁĄCZONO** while body still showed **Ładowanie…**. |
| 4 | **`calendar_connected=1` refetch** — OAuth return could re-trigger `load()` on dependency churn. |

## Fix

### Frontend

- `api.ts` — optional `timeoutMs` (9s default via `CALENDAR_FETCH_TIMEOUT_MS`); `isFetchTimeoutError`.
- `calendar/page.tsx` — per-provider `googleStatusPhase` / `microsoftStatusPhase`; parallel status fetches; events fetch timeout; guarded OAuth return refetch.
- `calendar-connections-panel.tsx` — per-provider loading/timeout/reconnect/retry/connect actions; status loading badge **Ładowanie statusu…**.
- `calendar-provider-health.ts` — timeout parsing, bootstrap helpers.
- i18n PL/EN terminal copy (status loading, timeout, retry, reconnect, session-safe hint).

### Backend

- `calendar_oauth_credentials._classify_oauth_failure` — upstream timeout → `temporary_error` (not `reconnect_required`).

## Terminal states (per provider)

1. **connected** — badge connected, events or empty week, no reconnect banner  
2. **not_connected** — badge + connect button, no loading body after bootstrap  
3. **reconnect_required** — **Połącz ponownie**, no disconnect first  
4. **temporary_error** — hint + **Spróbuj ponownie**  
5. **timeout** — **Nie udało się pobrać statusu kalendarza** + retry + connect when not known connected  

## Tests

```bash
cd frontend
npm run test:candidate-calendar-loading-state
npm run test:candidate-google-calendar-stability
npm run test:candidate-calendar-integration-health
```

## Production smoke

1. `/dashboard/calendar` — resolves within ~9s even if one provider is slow.  
2. Not connected — **Nie połączono** + **Połącz Google Calendar** / **Połącz Microsoft 365**, no infinite **Ładowanie…**.  
3. Slow/hung status — timeout copy + **Spróbuj ponownie**; TWIN session intact.  
4. Google hang — Microsoft card still resolves independently.

## Hard bans confirmed

- No infinite loading  
- No hidden errors  
- No TWIN session clear on provider failure  
- No disconnect-before-reconnect  
- No fake connected state  

## Follow-up P0 (2026-06-11)

PR #117 timeout alone was insufficient: **`auth/me` and ops health blocked `Promise.all`**, leaving provider phases on `"loading"`. See `docs/CANDIDATE_CALENDAR_P0_ROOT_CAUSE_FIX_2026-06-11.md` — immediate phase commit, ancillary timeouts, stale guards, `error` badge fix; `test:candidate-calendar-p0-root-cause`.
