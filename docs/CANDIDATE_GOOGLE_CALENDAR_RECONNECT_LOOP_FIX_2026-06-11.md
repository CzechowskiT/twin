# Candidate Google Calendar reconnect loop fix — 2026-06-11

**Branch:** `fix/candidate-google-calendar-reconnect-loop-2026-06-11`  
**Follows:** `docs/CANDIDATE_CALENDAR_INTEGRATION_HEALTH_FIX_2026-06-10.md` (provider health badges, 428 integration errors)

---

## EN — Problem

Founders reported a **reconnect loop** on `/dashboard/calendar`: Google showed connected, then repeatedly demanded **disconnect + reconnect** even when the refresh token was still valid. Every page load re-ran a blind refresh probe and treated transient Google failures like revoked tokens.

## EN — Root cause

| # | Finding |
| - | ------- |
| 1 | Access tokens were **not cached** — every API call refreshed from Google. |
| 2 | OAuth **re-consent** often omits `refresh_token`; callback **overwrote** the stored refresh with empty → permanent `reconnect_required`. |
| 3 | Status probe and events route treated **any** refresh/API error as reconnect; no `temporary_error` path. |
| 4 | Frontend copy said **“disconnect first”**, encouraging destructive loops. |

## EN — Fix

### Backend

- `calendar_oauth_credentials.py`: cache `access_token_encrypted` + `access_token_expires_at`; resolve with `force_refresh`; classify `reconnect_required` vs `temporary_error`.
- OAuth exchange/refresh dataclasses preserve refresh token when Google/Microsoft omit it on refresh.
- `GET …/events`: on upstream 401 → force refresh once → retry list; 503 for transient failures.
- Status payload: `can_reconnect`, `can_retry`, `health: temporary_error`.

### Frontend

- Badges: **Temporary error** + **Retry events** (no disconnect).
- Reconnect hints: **Connect again** without mandatory disconnect.
- After `?calendar_connected=1`, `load()` refreshes provider health immediately.

### Migration

`055_calendar_access_token_cache` adds access-token cache columns on `user_google_calendar` / `user_microsoft_calendar`.

## EN — Tests

```bash
cd backend && pytest tests/test_calendar_google_stability.py tests/test_calendar_routes.py -q
cd frontend && npm run test:candidate-google-calendar-stability
```

## EN — Smoke (founder)

1. Connect Google once — badge **Connected**, week events load.  
2. Wait past access-token expiry — silent refresh, still connected (no reconnect banner).  
3. Revoke app in Google Account — badge **Reconnect required**, single **Connect Google** (no disconnect step).  
4. Simulate Google 503 — **Temporary error** + **Retry events**; TWIN session stays signed in.  
5. Microsoft healthy + Google unhealthy — Microsoft events still visible (partial week).

---

## PL — Problem

Na `/dashboard/calendar` Google Calendar wchodził w **pętlę ponownego łączenia**: status „połączono”, a potem w kółko **odłącz i połącz**, mimo ważnego refresh tokena.

## PL — Przyczyna

Brak cache access tokena, nadpisywanie refresh tokena przy re-autoryzacji, zbyt agresywne `reconnect_required` oraz brak ścieżki **błąd tymczasowy / ponów**.

## PL — Naprawa

Cache tokenów w backendzie, jedna próba odświeżenia przy 401 na liście wydarzeń, status `temporary_error` + przycisk **Ponów ładowanie wydarzeń**, copy bez wymogu odłączenia przed ponownym połączeniem.

## PL — Testy i smoke

Jak w sekcji EN powyżej; po deploy uruchom migrację `055_calendar_access_token_cache` na środowisku docelowym.
