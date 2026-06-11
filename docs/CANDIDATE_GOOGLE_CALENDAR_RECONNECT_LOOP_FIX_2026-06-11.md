# Candidate Google Calendar reconnect loop fix — 2026-06-11

**Branch:** `fix/candidate-google-calendar-reconnect-loop-2026-06-11`  
**Owner:** TWIN Candidate Google Calendar Stability

## Problem (founder)

On `/dashboard/calendar`, Google Calendar repeatedly showed **WYMAGA PONOWNEGO POŁĄCZENIA** even after reconnect — a reconnect loop. Session must never clear on provider errors.

## Root cause

| # | Cause |
|---|--------|
| 1 | **Refresh on every request** — `_calendar_access_token` called Google token endpoint on every status probe and events fetch; transient 429/500 surfaced as reconnect. |
| 2 | **No access-token cache** — expired access token on Google API 401 mapped straight to `428 reconnect_required` without forced refresh + retry. |
| 3 | **OAuth re-connect overwrote refresh** — callback required new `refresh_token` from Google; re-consent often omits it → `no_refresh_token` or corrupt row. |
| 4 | **Eager reconnect UI** — status probe refresh failure immediately set `reconnect_required` even when cached access was still valid. |

## Fix

### Backend

- `calendar_oauth_credentials.py` — DB cache (`access_token_encrypted`, `access_token_expires_at`), `resolve_*_access_token`, preserve refresh when Google omits it on refresh.
- Status payload: `status`, `health`, `code`, `can_reconnect`, `can_retry` (no token exposure).
- `GET /google/events` — 401 → force refresh → single retry; 429/503 → `503 temporary_error`.
- OAuth callback — keep existing refresh when Google returns none on re-auth.
- Alembic `055_calendar_access_token_cache`.

### Frontend (follow-up in same PR when merged)

- Per-provider badges including `temporary_error` + **Retry** (no disconnect first).
- `load()` after `?calendar_connected=1` to clear stale reconnect state.
- Partial Microsoft success when Google unhealthy.

## Goal states

1. Connected + valid → events load, no banner  
2. Expired access + valid refresh → silent refresh  
3. Revoked refresh → `reconnect_required`, one Connect button, no logout  
4. Transient Google → `temporary_error`, retry  
5. Microsoft ok + Google bad → partial calendar  

## Tests

```bash
cd backend && pytest tests/test_calendar_google_stability.py tests/test_calendar_routes.py -q
cd frontend && npm run test:candidate-google-calendar-stability
```

## Production smoke

1. Log in → `/dashboard/calendar` — session stable 5+ min.  
2. With valid Google: week events load, badge **POŁĄCZONO**.  
3. Revoke Google refresh in console → badge **WYMAGA PONOWNEGO POŁĄCZENIA**, TWIN session intact.  
4. Connect Google (no disconnect) → success banner, events load.  
5. Microsoft connected + Google bad → Microsoft events still visible.

## Hard bans

- Never `clearToken()` / logout on calendar `401`/`428`/`503`.  
- Never return TWIN `401` for provider token failure (use `428` or `503`).  
- Never overwrite `refresh_token_encrypted` with empty on OAuth callback.  
- Never show reconnect for transient `429`/`500`/`503`.
