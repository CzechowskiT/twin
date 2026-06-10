# Candidate calendar auth routing fix — 2026-06-08

**Branch:** `fix/candidate-calendar-session-routing-2026-06-08`  
**Symptom:** Logged-in candidate clicks **Kalendarz** → logout or redirect to `/login`.  
**Expected:** Stay authenticated → `/dashboard/calendar` (connect guidance / empty week).

---

## Root cause

1. **Session lane drift** — `PersonaProvider` preferred a stale `twin_session_persona` over the candidate-only calendar route, so header guards and nav could disagree after OAuth or cross-lane browsing.
2. **Calendar page local logout** — `dashboard/calendar/page.tsx` called `clearToken()` on load errors (duplicate of global `apiFetch` auth handling), amplifying transient failures into full session loss.
3. **Scattered hrefs** — Calendar entry points hard-coded `/dashboard/calendar` without a single canonical helper, making regressions hard to catch.

Recruiter **Kalendarz** → `/recruiter/calendar` (NOT LIVE placeholder) is **unchanged** (PR #43).

---

## Fix (frontend-only)

| Area | Change |
| ---- | ------ |
| `persona-access.ts` | `CANDIDATE_CALENDAR_HREF`, `candidateCalendarHref()`, `sessionPersonaLockedByPath()` |
| `persona-provider.tsx` | Path-locked single-persona routes sync session lane on navigation |
| `onboarding-gate.tsx` | Bypass onboarding redirect for `/dashboard/calendar` |
| `auth/callback/page.tsx` | Set `twin_session_persona` from `next` path after OAuth |
| Calendar page | Remove local `clearToken`; unauthenticated → `/login/candidate?next=…` |
| Entry points | Subnav, calendar strip, NBA, demo walkthrough → `candidateCalendarHref()` |

**Auth/CSP/env:** No weakening. Global JWT handling in `api.ts` unchanged for app auth (`Invalid token`, `Inactive user`).

**Follow-up (2026-06-10):** Post-load logout when provider OAuth token expired — see [`CANDIDATE_CALENDAR_POST_LOAD_LOGOUT_FIX_2026-06-10.md`](./CANDIDATE_CALENDAR_POST_LOAD_LOGOUT_FIX_2026-06-10.md). Calendar integration **401/400** no longer calls `clearToken()`.

---

## Tests

```bash
cd frontend
npm run test:candidate-calendar-routing   # new + persona-access
npm run test:candidate-calendar-post-load-auth
npm run test:homepage-nav
npm run test:auth-role-choice
npm run test:trust-language-guard
npm run test:guided-empty-state
npm run lint && npx tsc --noEmit && npm run build
```

Optional backend: `pytest backend/tests/test_public_surfaces_no_secrets.py -q`

---

## Smoke (prod alias)

| Route | Expect |
| ----- | ------ |
| `GET /dashboard/calendar` | **200** (logged-out HTML shell OK) |
| `GET /api/public-health` | **200** `ok` |

Founder authenticated: header **Kalendarz** → calendar page, session intact, no login loop.

---

## Launch stance

Public **NO-GO** · auto-apply **PAUSED** · delegated **NOT LIVE** · recruiter calendar sync **NOT LIVE**.
