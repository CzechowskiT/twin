# Candidate login stuck on “Logowanie…” — P0 incident (2026-06-11)

**Severity:** P0 — founder blocked from candidate sign-in  
**Route:** https://twin-sooty.vercel.app/login/candidate  
**Branch:** `fix/p0-candidate-login-stuck-2026-06-11` → superseded by `fix/p0-auth-login-and-options-2026-06-11`  
**Owner:** TWIN agent (auth/login)  
**Companion:** `docs/AUTH_LOGIN_AND_OPTIONS_INCIDENT_2026-06-11.md` (OAuth visibility + same upstream outage)  
**Follow-up (2026-06-12):** `docs/AUTH_BROWSER_STATE_AND_OAUTH_OPTIONS_INCIDENT_2026-06-12.md` — stale localStorage token sent on login POST in normal browser

---

## Symptom

Email + password filled → submit → button shows **Logowanie…** / **Signing in…** indefinitely. No redirect, no inline error, no toast.

---

## Production trace (pre-fix, 2026-06-11)

### Browser MCP — `/login/candidate`

| Observation | Result |
| ----------- | ------ |
| Submit click | Button → **Signing in…**, `disabled` |
| After 15s+ | Still loading; no error text |
| Console | No JS exceptions on login |
| Network (page load) | `GET /api/v1/health?ops=1` → **429**; `GET /api/v1/public/mvp-stats` → **429** |
| Network (login POST) | Pending until proxy/upstream timeout (no fast JSON error in UI) |

### curl — public-health

```bash
curl -s --max-time 20 https://twin-sooty.vercel.app/api/public-health
```

**Result:** client timeout at 20s (HTTP 000) — Vercel route waited on hung Railway upstream.

### curl — Railway health

```bash
curl -s --max-time 20 "https://twin-production-bcd9.up.railway.app/api/v1/health?ops=1&db=1"
```

**Result:** client timeout at 20s (HTTP 000) — API host not responding within probe window.

### curl — login proxy (invalid creds probe)

```bash
curl -s --max-time 15 -X POST "https://twin-sooty.vercel.app/api/v1/auth/login/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpass123"}'
```

**Result:** timeout at 15s — same upstream hang path as UI login.

**Root cause (layered):**

1. **Primary:** Railway API intermittently **non-responsive** (health + login hang >20s).
2. **Amplifier:** Frontend login had **no `timeoutMs`** — `fetch` waited for Vercel proxy (45s abort) with loading UI stuck.
3. **Secondary:** Heavy rate-limit traffic (429 on health) during page load; login should still fail fast when upstream is dead.

---

## Login endpoint map

| Layer | Path | Notes |
| ----- | ---- | ----- |
| UI route | `/login/candidate` | `LoginZoneForm` |
| Browser POST | `/api/v1/auth/login/json` | Same-origin (unauthenticated → proxy) |
| Next proxy | `frontend/src/app/api/v1/[[...path]]/route.ts` | Forwards to Railway; **pre-fix** 45s upstream abort |
| Backend | `POST /api/v1/auth/login/json` | `backend/app/api/auth.py` → `_authenticate` |
| Schema | `{ email, password }` → `{ access_token }` | SlowAPI `5/minute` per IP |
| Token storage | `setToken` → `twin_access_token` | localStorage with sessionStorage fallback |
| Redirect | `postLoginPath(zone)` → `/dashboard` (candidate) | After token + persona |

---

## Fix (code)

| Change | File |
| ------ | ---- |
| **10s client timeout** on login `apiFetch` | `login-zone-form.tsx` + `LOGIN_REQUEST_TIMEOUT_MS` |
| **Mapped errors** (401/403/429/5xx/timeout/network/malformed token) | `frontend/src/lib/login-error.ts` |
| Polish copy keys | `login.invalidCredentials`, `login.rateLimited`, `login.temporarilyUnavailable` |
| **`finally` clears loading** | preserved in form |
| **Auth proxy upstream abort 12s** | `route.ts` when path starts with `auth/` |
| **public-health upstream abort 12s** + 502 JSON on failure | `public-health/route.ts` |
| Regression tests (9 cases) | `npm run test:auth-login-stuck-regression` |

**Security:** No auth weakening, no bypass, no password logging.

---

## Verification

### Local / CI

```bash
cd frontend
npm run test:auth-login-stuck-regression
npm run test:auth-role-choice
npm run test:trust-language-guard
npm run lint
npx tsc --noEmit
npm run build
```

### Production smoke (post-deploy — required)

| # | Check | Pass criteria |
| - | ----- | ------------- |
| 1 | `GET /api/public-health` | JSON within **12s** with `status` / `db_ok` / `git_commit` **or** explicit 502 degraded (not hang) |
| 2 | Login submit (invalid creds) | Error within **10s**, button re-enabled |
| 3 | Login submit (valid founder creds) | Redirect `/dashboard` within **10s**, token in storage |
| 4 | `/dashboard/calendar` | Session preserved on provider errors (existing calendar guards) |

**Pre-fix production smoke:** **FAIL** — steps 1–3 blocked by Railway upstream timeout; UI stuck on loading.

**Post-fix production smoke (2026-06-11 evening):** Password UX **PARTIAL PASS** on prod — dummy submit shows English *Could not sign in. Try again shortly.* within ~10s (PR #120 live); valid login **FAIL** while Railway times out. Login options fix **PENDING** — see `AUTH_LOGIN_AND_OPTIONS_INCIDENT_2026-06-11.md`.

---

## Related docs

- `docs/FOUNDER_PREMIUM_PRODUCT_QA_CHECKLIST_2026-06-08.md` — §1 login check
- `docs/PRODUCTION_REALITY_MATRIX_2025-05-27.md` — candidate login row
- `docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md` — auth smoke row
