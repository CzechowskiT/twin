# Candidate calendar post-load logout fix — 2026-06-10

**Branch:** `fix/candidate-calendar-post-load-logout-2026-06-10`  
**Symptom:** Logged-in candidate opens **Kalendarz** → `/dashboard/calendar` renders briefly → ~1s later session cleared → redirect to login.  
**Expected:** Stay authenticated; disconnected calendar shows connect/empty state (PL/EN), no logout.

---

## Root cause

After PR #60 fixed calendar **href** routing, a **post-load** authenticated fetch still hit global `apiFetch` auth handling:

| Request | When | Problem |
| ------- | ---- | ------- |
| `GET /api/v1/calendar/{google\|microsoft}/events` | Connected row in DB, provider OAuth token expired/revoked | Backend returned **401** with “reconnect … Calendar” |
| `apiFetch` → `handleAuthFailure` | Any **401** | Called `clearToken()` + `window.location.assign('/login?next=…')` |

**A vs B (product contract):**

- **A — App auth invalid** → redirect login ✅ (unchanged)
- **B — Calendar not connected / provider token bad** → empty/connect UI, **no** session clear ✅ (this fix)

Disconnected users with no DB row were usually fine; the loop appeared when status showed **connected** but provider token was stale, or when a calendar route returned integration-shaped **401**.

---

## Fix

| Layer | Change |
| ----- | ------ |
| `frontend/src/lib/api.ts` | `isCalendarIntegrationFailure`, `shouldClearSessionOnApiError`; gate `clearToken` before calendar integration errors |
| `frontend/.../calendar/page.tsx` | Interviews feed → `/api/v1/calendar/me/interviews`; week events fetch sets `preserveSessionOnUnauthorized: true` |
| `backend/.../calendar.py`, `calendar_microsoft.py` | Provider OAuth refresh failures: **401 → 400** (integration error, not TWIN JWT) |

**Auth/CSP/env:** No weakening. `get_current_user` **401** (`Invalid token`, `Inactive user`) still clears session globally.

**Copy (PL/EN):** Existing keys — `dashboard.calendarPageLeadDisconnected`, `calendarConnectHeroTitle`, `calendarConnectHeroBody`.

---

## Tests

```bash
cd frontend
npm run test:candidate-calendar-post-load-auth
npm run test:candidate-calendar-routing
npm run lint && npx tsc --noEmit && npm run build
```

Backend (optional): `pytest backend/tests/test_calendar_routes.py -q`

---

## Smoke

| Check | Expect |
| ----- | ------ |
| Logged-in candidate → header **Kalendarz** | `/dashboard/calendar`, session intact ≥5s |
| Calendar not connected | Connect hero + connections panel; no redirect to login |
| Expired Google/Microsoft token (connected row) | Reconnect badge + partial/empty UI; **no** logout; see [`CANDIDATE_CALENDAR_INTEGRATION_HEALTH_FIX_2026-06-10.md`](./CANDIDATE_CALENDAR_INTEGRATION_HEALTH_FIX_2026-06-10.md) |

**Follow-up (integration health):** Status endpoints now probe token refresh (`health: ok | reconnect_required`). Frontend loads events per healthy provider; stale tokens show **WYMAGA PONOWNEGO POŁĄCZENIA**, not false **POŁĄCZONO**.

**Launch stance:** Public **NO-GO** · auto-apply **PAUSED** · delegated **NOT LIVE** · recruiter calendar **NOT LIVE**.
