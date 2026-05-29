# P2 httpOnly auth + CSRF rollout plan — 2026-05-27

**Design only — no implementation this session.**  
Pairs with `docs/P1_SECURITY_IMPLEMENTATION_PLAN_2026-05-27.md` §2.

## Current state (audit)

| Surface | Storage | Risk |
| ------- | ------- | ---- |
| Candidate JWT | `localStorage` (`frontend/src/lib/auth.ts`) | XSS exfiltration |
| Recruiter JWT | same | same |
| OAuth callbacks | token in URL fragment/query → copied to storage | transient leak |

## Target state

- `access_token` in **httpOnly**, `Secure`, `SameSite=Lax` cookie.
- **Double-submit CSRF** for mutations (`csrf_token` cookie + `X-CSRF-Token`).
- Refresh token optional P2.1 — out of first cut.

## Touchpoints inventory (FE)

- `frontend/src/lib/auth.ts` — get/set/clear token
- `frontend/src/lib/api.ts` — `Authorization` header builder
- `frontend/src/middleware.ts` — dashboard guard (reads token client-side today)
- Login / register / OAuth callback pages
- Playwright smoke — `localStorage.clear()` in dashboard guard test

## Touchpoints inventory (BE)

- `app/api/auth.py` — login/register/oauth responses
- `app/core/deps.py` — `get_current_user` (read cookie **or** Bearer during migration)
- CORS `allow_credentials=True` + explicit `Access-Control-Allow-Credentials`

## Rollout slices (do not collapse)

1. BE: accept Bearer **or** cookie; set cookie on login only (feature flag).
2. FE: send credentials; stop writing `localStorage` when flag on.
3. BE: CSRF on POST/PATCH/DELETE (exclude webhooks, CSP report).
4. FE: attach CSRF header from cookie.
5. Remove Bearer path + delete `localStorage` migration banner.

## Hard bans respected

No cookie change shipped without founder cookie-domain decision and
a staged preview burn-in.
