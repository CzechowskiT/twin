# Candidate calendar integration health fix — 2026-06-10

**Branch:** `fix/candidate-calendar-integration-health-2026-06-10` (PR #69)  
**Follows:** `docs/CANDIDATE_CALENDAR_POST_LOAD_LOGOUT_FIX_2026-06-10.md` (PR #68 — session no longer cleared on calendar errors)  
**Symptom:** Logged-in candidate on `/dashboard/calendar` sees **POŁĄCZONO** for Google and Microsoft, but weekly events do not load; generic error *„Akcja kalendarza nie powiodła się…”*.

---

## Related fixes (same week)

| Doc | Issue | Status |
| --- | ----- | ------ |
| `CANDIDATE_CALENDAR_POST_LOAD_LOGOUT_FIX_2026-06-10.md` | Session cleared when provider token expired | Fixed — preserve session on calendar integration 401/400 |
| `CANDIDATE_CALENDAR_SUCCESS_ALERT_POLISH_2026-06-10.md` | Success banner unreadable after `?calendar_connected=1` | Fixed — high-contrast emerald alert + PL/EN copy (PR #70) |

---

## Diagnosis (production-like failure)

| # | Finding |
| - | ------- |
| 1 | **Failing request:** `GET /api/v1/calendar/google/events?time_min=…&time_max=…` when Google OAuth refresh token is expired/revoked. Microsoft may still be healthy. |
| 2 | **Status/body:** HTTP **428** (or legacy **400**) with `detail`: *Calendar token expired or revoked; reconnect Google Calendar.* TWIN JWT remains valid (**200** on `/api/v1/auth/me`). |
| 3 | **Why POŁĄCZONO:** Status endpoints returned `connected: true` from DB row alone — no token refresh probe. Frontend badge used `connected` only. |
| 4 | **Whole week blocked:** Frontend picked **one** provider (`google` if connected, else `microsoft`). Stale Google blocked fetch even when Microsoft was usable. Any failure surfaced generic `calendarErrorGeneric`. |

`GET /api/v1/calendar/me/interviews` is independent and was not the primary failure in founder report.

---

## Fix — provider health (PR #69)

### Backend contract

`GET /api/v1/calendar/google/status` and `…/microsoft/status` now include:

| Field | Values |
| ----- | ------ |
| `connected` | `true` if OAuth row exists |
| `health` | `ok` \| `reconnect_required` \| `error` \| `unknown` |
| `message` | Provider-specific reconnect hint when stale |
| `provider` | `google` \| `microsoft` |

Status probes refresh token (no calendar list call). Expired/revoked tokens → `health: reconnect_required`, not healthy `ok`.

Event routes: refresh failure → **428 Precondition Required** (integration error, not TWIN **401**).

Shared probe: `backend/app/services/calendar_provider_health.py`.

### Frontend

| Area | Change |
| ---- | ------ |
| `calendar-provider-health.ts` | Health snapshots, multi-provider week fetch, partial/empty/reconnect aggregation |
| `calendar/page.tsx` | Fetch events per **healthy** provider; merge; no session clear on 428 |
| `calendar-connections-panel.tsx` | Badges: POŁĄCZONO / WYMAGA PONOWNEGO POŁĄCZENIA / NIEPOŁĄCZONO / BŁĄD INTEGRACJI |
| `calendar-week-view.tsx` | Empty week, reconnect panel, partial warning — not generic error only |
| `i18n.ts` | PL/EN copy for badges, reconnect, partial failure, empty week |

---

## Fix — success alert (PR #70)

After Google/Microsoft OAuth redirect to `/dashboard/calendar?calendar_connected=1`:

- Dedicated `CalendarConnectedSuccessAlert` with emerald border, translucent overlay, check icon
- Copy: **Kalendarz połączony** / **Calendar connected** + body about events visible in TWIN
- Auto-dismiss ~7s; `router.replace` strips `calendar_connected` query param
- Error/denied banners unchanged

**Launch stance:** unchanged — public **NO-GO**, auto-apply **PAUSED**, no env/DB/CSP/auth weakening.

---

## Tests

```bash
cd frontend
npm run test:candidate-calendar-integration-health
npm run test:candidate-calendar-success-alert
npm run test:candidate-calendar-post-load-auth
npm run test:candidate-calendar-routing
npm run test:trust-language-guard
npm run lint && npx tsc --noEmit && npm run build

cd ../backend
pytest backend/tests/test_calendar_routes.py -q
```

---

## Smoke (founder)

1. Open `/dashboard/calendar` while logged in — session intact ≥5s.  
2. If Google token stale: badge **WYMAGA PONOWNEGO POŁĄCZENIA** on Google; Microsoft events still load if healthy.  
3. If both stale: reconnect panel with provider guidance; TWIN stays signed in.  
4. If both healthy, no events: **Brak wydarzeń w tym tygodniu** — not failure banner.  
5. Reconnect: Disconnect → Connect on affected provider(s).  
6. After OAuth return with `?calendar_connected=1`: success banner readable on dark theme; auto-dismiss ~7s.

---

## Remaining founder action

Reconnect any provider showing **WYMAGA PONOWNEGO POŁĄCZENIA** (Google and/or Microsoft) via the connections panel.
