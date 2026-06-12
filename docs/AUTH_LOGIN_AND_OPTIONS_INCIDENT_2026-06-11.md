# Auth login + login options — P0 incident (2026-06-11)

**Severity:** P0 — candidate cannot sign in; OAuth/alternate providers hidden  
**Route:** https://twin-sooty.vercel.app/login/candidate  
**Branch:** `fix/p0-auth-login-and-options-2026-06-11`  
**Related:** `docs/CANDIDATE_LOGIN_STUCK_INCIDENT_2026-06-11.md` (password hang subset)

---

## Symptoms

1. **Password login:** Submit → **Logowanie…**; with PR #120 deployed, fails within ~10–12s with generic unavailable copy when Railway is down; valid founder creds cannot succeed while API is hung.
2. **Login options:** Google/GitHub/Microsoft rows **absent** when `health?ops=1` fails or returns all flags false; LinkedIn section stuck on **…** when `mvp-stats` hangs; bottom link **„Wszystkie opcje logowania”** navigates to **role hub** (`/login`), not OAuth expand — users expect providers there.

---

## Production trace (2026-06-11)

### curl (10s max)

| Target | Duration | Status | Body |
| ------ | -------- | ------ | ---- |
| `GET /api/public-health` (Vercel) | **10.0s** | **timeout** (curl 28) | 0 bytes |
| `GET /api/v1/health?ops=1&db=1` (Railway direct) | **10.0s** | **timeout** (curl 28) | 0 bytes |
| `POST /api/v1/auth/login/json` (Vercel proxy, dummy creds) | **10.0s** | **timeout** (curl 28) | request sent, 0 bytes response |
| `POST /api/v1/auth/login/json` (Railway direct, dummy creds) | **10.0s** | **timeout** (curl 28) | request sent, 0 bytes response |

**git_commit:** unavailable — upstream never returned JSON.

### Browser MCP — `/login/candidate` (pre–options-fix deploy)

| Check | Result |
| ----- | ------ |
| Rendered options | Email + password only; LinkedIn **…**; **no** Google/GitHub/Microsoft rows |
| „All sign-in options” / „Wszystkie opcje logowania” | Link → `/login` role hub (not OAuth expand) |
| Password submit (`test@example.com` / dummy) | **Signing in…** ~10s → **Could not sign in. Try again shortly.**; button re-enabled |
| OAuth providers | Not visible (health fetch failed/timed out) |

---

## Root cause (layered)

1. **Primary:** Railway API **non-responsive** (>10s) on health + login.
2. **Password amplifier (fixed PR #120):** missing client `timeoutMs` — now 10s + `finally` clears loading.
3. **Options amplifier (this fix):** OAuth section gated on `hasConfiguredOAuthProvider`; unconfigured rows returned `null`; health/mvp-stats fetches had **no timeout** → infinite **…** and hidden provider list.

---

## Fix (code)

| Change | File |
| ------ | ---- |
| Always show alternate login block; **„Pokaż wszystkie opcje logowania”** expand when none configured | `login-zone-form.tsx` |
| OAuth rows **disabled** when off-server, not hidden | `oauth-web-buttons.tsx` |
| `health?ops=1` fetch **10s** abort | `oauth-auth.ts` |
| `mvp-stats` fetch **10s** abort | `linkedin-login-section.tsx` |
| Register form: same visible OAuth rows | `register-zone-form.tsx` |
| i18n: `showAllLoginOptions`, `hideLoginOptions`, `oauthUnavailable`, `oauthStatusLoading` | `i18n.ts` |
| Regression **10 cases** | `npm run test:auth-login-options-and-password` |

**Security:** No auth weakening, no bypass, no password logging.

---

## Verification

### Local / CI

```bash
cd frontend
npm run test:auth-login-options-and-password
npm run test:auth-login-stuck-regression
npm run test:auth-role-choice
npm run test:trust-language-guard
npm run lint   # pre-existing errors in unrelated dashboard files
npx tsc --noEmit
npm run build
```

### Production smoke (post-deploy — required)

| # | Check | Pass criteria |
| - | ----- | ------------- |
| 1 | `GET /api/public-health` | JSON or 502 within **12s** (not hang) |
| 2 | `/login/candidate` options | Google/GitHub/Microsoft visible (enabled or disabled); LinkedIn not stuck on **…** |
| 3 | Expand | **„Pokaż wszystkie opcje logowania”** reveals disabled rows when API flags false |
| 4 | Bad password | Error ≤**10s**, Polish copy, button re-enabled |
| 5 | Founder manual login | Redirect `/dashboard` when Railway healthy |

**Pre-fix production:** password UX **PARTIAL PASS** (timeout error, not infinite hang); login options **FAIL**; Railway **FAIL**.  
**Post-fix production:** **PARTIAL** — PR #121 deployed; founder still reports normal-browser vs incognito split (2026-06-12).  
**Follow-up:** `docs/AUTH_BROWSER_STATE_AND_OAUTH_OPTIONS_INCIDENT_2026-06-12.md` — stale `twin_access_token` + OAuth public-health fallback.

---

## Founder manual login note

While Railway is hung, email login will show **„Nie udało się zalogować…”** within 10s — expected. After Railway recovery + Vercel deploy of this branch, re-test founder creds on `/login/candidate` and confirm OAuth rows match `health?ops=1` flags.
