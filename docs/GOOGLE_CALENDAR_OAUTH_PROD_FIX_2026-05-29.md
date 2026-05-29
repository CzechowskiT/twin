# Google Calendar OAuth — production redirect fix (2026-05-29)

**Symptom:** Google OAuth error `redirect_uri_mismatch` when connecting from prod frontend.  
**Frontend:** https://twin-sooty.vercel.app  
**API (OAuth callback host):** https://twin-production-bcd9.up.railway.app  
**Requested redirect URI (must match exactly):**

```text
https://twin-production-bcd9.up.railway.app/api/v1/calendar/google/callback
```

No trailing slash. Scheme `https`. Path is on the **API** host, not Vercel.

**Code status (2026-05-29):** Repo resolves the same URI via `effective_google_calendar_redirect_uri()` when `GOOGLE_CALENDAR_REDIRECT_URI` is unset and `API_URL` points at Railway. **Fix is external Google Cloud Console config** unless Railway `API_URL` / env drifts.

**Hard bans for agents:** no prod env change, no secret rotation, no Railway deploy, no OAuth token logs.

---

## Production smoke — PASS (2026-05-29 UTC)

| Check | Result |
| ----- | ------ |
| Authorized JS origin | `https://twin-sooty.vercel.app` — confirmed in Google Cloud Console |
| Authorized redirect URI | `https://twin-production-bcd9.up.railway.app/api/v1/calendar/google/callback` — byte-exact, no trailing slash |
| Google Calendar API | Enabled on OAuth project |
| Test user access | Confirmed (pilot account) |
| Connect flow | **PASS** — no `redirect_uri_mismatch`; consent completes |
| Post-connect UI | `/dashboard/calendar` shows Google connected |
| Real events | Visible on calendar view after reconnect |
| Week day mapping (timed + all-day) | **PASS** (founder re-smoke 2026-05-29) — Mon 2026-05-25 under Monday; all-day 2026-05-27 under Wednesday; no +1 day shift (`Europe/Warsaw`) |
| Fix type | OAuth: **Google Cloud Console config only**. Day mapping: **frontend only** (`calendar-week` local date keys) — Vercel prod `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH`, fix HEAD `3631c45`; **no Railway** |
| Calendar mutations during smoke | **None** |
| Secrets logged | **None** |

**Operator:** founder
**Evidence cross-ref:** `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` § Google Calendar OAuth prod smoke; `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` O5.

---

## Founder re-smoke — FULL PROD PASS (2026-05-29 UTC)

| Check | Result |
| ----- | ------ |
| Google OAuth / Connect | **PASS** (already attested) |
| Real events visible | **PASS** |
| Week day mapping (timed + all-day) | **PASS** — local IANA date grouping; no UTC +1 shift |
| Vercel prod deploy | `dpl_GrfAmEbCbvQyR7NdokQJ31gzoWMH` |
| Fix HEAD | `3631c45afea26c60e61dcf9fa31f691b307a2a33` |
| Railway / env / migration | **None** — FE-only fix |
| OAuth tokens logged | **None** |
| Calendar mutations | **None** |

---

## Google Cloud Console steps (founder)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → project that owns the TWIN OAuth client used by prod (`GOOGLE_CLIENT_ID` on Railway).
2. **APIs & Services** → **Credentials** → OAuth 2.0 Client ID type **Web application** (same client as calendar).
3. **Authorized JavaScript origins** — add if missing:
   - `https://twin-sooty.vercel.app`
4. **Authorized redirect URIs** — add **exactly** (copy/paste, no trailing `/`):
   - `https://twin-production-bcd9.up.railway.app/api/v1/calendar/google/callback`
5. Save. Allow a few minutes for Google to propagate.
6. Optional read-only verify (no secrets): `GET https://twin-production-bcd9.up.railway.app/api/v1/calendar/oauth-config` (authenticated) or `GET /api/v1/health?ops=1` (admin) → field `google_calendar_redirect_uri` must equal the URI above byte-for-byte.

**Do not** put the Railway callback URL in “JavaScript origins”. **Do not** use `https://twin-sooty.vercel.app/.../callback` as redirect — the browser returns to the API after Google auth.

Local dev (separate client or same client with extra URIs):

- `http://localhost:8000/api/v1/calendar/google/callback`
- `http://localhost:3000/api/v1/calendar/google/callback` (Next.js proxy)

---

## Smoke test (founder, prod)

1. Log in at https://twin-sooty.vercel.app with pilot test account.
2. Open `/dashboard/calendar`.
3. Confirm Microsoft shows connected (baseline) and Google shows not connected.
4. Click **Connect Google** (or dashboard calendar strip equivalent).
5. Complete Google consent — expect redirect back to `/dashboard/calendar?calendar_connected=1` (no `calendar_error` query param).
6. Page shows Google connected; no `redirect_uri_mismatch` in Google error screen.
7. Disconnect Google (optional) — status returns to not connected without 500.

**FAIL signals:** Google error page with `redirect_uri_mismatch`; return URL with `calendar_error=exchange_failed` or `invalid_state`; env var names shown in UI (must not appear).

---

## Frontend error copy (if OAuth fails)

After deploy of UX branch, `/dashboard/calendar` maps query params to user-facing messages (no env names):

| `calendar_error` | User message key |
| ---------------- | ---------------- |
| `google_denied` | `dashboard.calendarErrorGoogleDenied` |
| `microsoft_denied` | `dashboard.calendarErrorMicrosoftDenied` |
| `exchange_failed` | `dashboard.calendarErrorExchange` |
| `no_refresh_token` | `dashboard.calendarErrorNoRefresh` |
| `invalid_state` | `dashboard.calendarErrorInvalidState` |
| (other) | `dashboard.calendarErrorGeneric` |

---

## Related

- `docs/RAILWAY_PROD_ENV_CHECKLIST.md` — `GOOGLE_CALENDAR_REDIRECT_URI` / `API_URL`
- `backend/app/services/calendar_oauth_redirect.py` — URI resolution
- `docs/FOUNDER_AUTHENTICATED_SMOKE_EVIDENCE_2026-05-29.md` — calendar row
- `docs/PUBLIC_LAUNCH_GATE_CHECKLIST_2026-05-27.md` — O5 Google+Microsoft OAuth prod PASS; Apple/iCal still partial
