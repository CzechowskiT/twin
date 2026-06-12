# Auth browser state + OAuth options — P0 incident (2026-06-12)

**Severity:** P0 — normal browser login fails; OAuth rows grey despite healthy API  
**Route:** https://twin-sooty.vercel.app/login/candidate  
**Branch:** `fix/p0-auth-browser-state-oauth-options-2026-06-12`  
**Supersedes:** `docs/AUTH_LOGIN_AND_OPTIONS_INCIDENT_2026-06-11.md` (options visibility subset)  
**Related:** `docs/CANDIDATE_LOGIN_STUCK_INCIDENT_2026-06-11.md` (password timeout subset)

---

## Symptoms (founder, post PR #121)

| Context | Password login | OAuth options |
| ------- | -------------- | ------------- |
| **Incognito** | Works → `/dashboard` | Visible / clickable |
| **Normal browser** | Slow or **„Nie udało się zalogować…”** | Hidden until expand; then Google/GitHub/Microsoft **grey/disabled** while `public-health` shows all `*_oauth_configured: true` |

---

## Root cause (layered)

1. **Stale `twin_access_token` in localStorage** made `apiFetch` treat login as **authenticated** → browser called Railway **directly** (`NEXT_PUBLIC_API_URL`) with `Authorization: Bearer <stale>` instead of same-origin proxy. Incognito has no token → proxy path works.
2. **Vercel proxy forwarded** stale `Authorization` on `POST /auth/login/json` (defence-in-depth gap).
3. **OAuth availability** used only `GET /api/v1/health?ops=1`; on timeout/429 all flags defaulted **false** → grey disabled rows even when `GET /api/public-health` returned configured **true**.

**Not in scope:** auth weakening, password logging, launch GO.

---

## Fix (code)

| Change | File |
| ------ | ---- |
| `isCredentialExchangePath` — login/register never attach stored bearer | `api.ts` |
| Proxy strips `Authorization` on POST login/register | `app/api/v1/[[...path]]/route.ts` |
| `prepareForCredentialLogin` — clear expired/malformed JWT on login mount/submit | `auth.ts`, `login-zone-form.tsx` |
| Login `apiFetch(..., null)` + `preserveSessionOnUnauthorized` + `clearToken` on fail | `login-zone-form.tsx` |
| `AuthProviderAvailability` model + `public-health` fallback | `oauth-auth.ts`, `use-oauth-provider-status.ts`, `oauth-web-buttons.tsx` |
| Diagnostic codes `AUTH_*` (console only) | `login-error.ts` |
| Regression **10 cases** | `npm run test:auth-normal-browser-regression` |

---

## Production trace (2026-06-12, pre-fix deploy `git_commit` 55b3835)

### curl

| Target | HTTP | Time | Notes |
| ------ | ---- | ---- | ----- |
| `GET /api/public-health` | 200 | ~4.4s | `google/github/microsoft_oauth_configured: true` |
| `GET /api/v1/health?ops=1` | 200 | ~0.37s | Same OAuth flags |
| `POST /api/v1/auth/login/json` + stale `Authorization` | 401 | ~0.32s | Proxy OK; client-side direct-route bug |

### Browser MCP — `/login/candidate` (clean session)

- Page renders; OAuth depends on health fetch (production still on pre-fix bundle for stale-token path).

---

## Verification

### Local / CI

```bash
cd frontend
npm run test:auth-normal-browser-regression
npm run test:auth-login-options-and-password
npm run test:auth-login-stuck-regression
npm run test:auth-role-choice
npm run test:trust-language-guard
npx tsc --noEmit
npm run build
```

### Production smoke (post-deploy — required)

| # | Check | Pass criteria |
| - | ----- | ------------- |
| 1 | `GET /api/public-health` | JSON ≤12s; OAuth flags true |
| 2 | Normal browser + stale token simulation | Password login via proxy; no direct Railway CORS failure |
| 3 | Incognito login | Still works |
| 4 | OAuth rows | Clickable links when flags true (not grey dead) |
| 5 | Bad password | **Nieprawidłowy e-mail lub hasło.** ≤10s |

**Pre-fix production (`55b3835`):** API healthy; stale-browser password path **FAIL** (code); OAuth grey on health miss **FAIL**.  
**Post-fix production:** **PENDING DEPLOY** (merge `fix/p0-auth-browser-state-oauth-options-2026-06-12`).

---

## Security

No bypass, no fake tokens, no password logging. Expired JWT cleared only; locale/persona keys preserved.
