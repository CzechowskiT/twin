# Founder / Test Account Auth Smoke Setup — 2026-06-19

**Owner:** TWIN Founder/Test Account Authenticated Persistence Smoke Setup  
**Branch:** `ops/founder-test-auth-smoke-setup-2026-06-19`  
**Baseline:** PR #220 merged at `1622b978`

## Purpose

Safe production authenticated POST smoke for persistence APIs (batch 060–067). Verifies auth gates by default; with a founder/test JWT, creates append-only internal demo records — **no external side effect**, **no secrets in repo**.

---

## How auth is validated

| Layer | Mechanism |
|-------|-----------|
| **Persistence APIs** | FastAPI `OAuth2PasswordBearer` → `get_current_user` in `backend/app/core/deps.py` |
| **JWT decode** | `decode_access_token()` in `backend/app/core/security.py` — HS256, `sub` = user email |
| **User lookup** | Active `User` row by email; inactive → 401 |
| **Admin ops** | Separate bearer: `OPS_ADMIN_TOKEN` / `beta_admin_token` via `_require_ops_admin()` — **not** user JWT |

Unauthenticated GET/POST on persistence routes → **401**.  
Unauthenticated GET on `/api/v1/admin/migrations/current` → **401**.

**No backdoor.** No unauthenticated write bypass. No auth weakening in this slice.

---

## Token type required

- **Type:** Standard TWIN access JWT (same as browser login)
- **Header:** `Authorization: Bearer <token>`
- **Scope:** Any active user with valid JWT can hit persistence endpoints (persona not separately gated on these routes)
- **Recommended account:** `demo@twin.career` (investor demo seed) or founder prod account — **never commit credentials**

---

## Safe environment variable

| Variable | Required | Description |
|----------|----------|-------------|
| `TWIN_PROD_TEST_JWT` | For authenticated POST | Bearer JWT — set in shell/1Password only |
| `TWIN_PROD_SMOKE_WRITE` | For POST | Must be `1` to enable writes |
| `TWIN_PROD_BASE_URL` | No | Default `https://twin-sooty.vercel.app` |

---

## How to obtain a JWT (founder ops)

1. **Browser login (preferred):** Sign in at https://twin-sooty.vercel.app/login with demo or founder account. DevTools → Application → localStorage or Network → copy `access_token` from login response. **Never paste into chat or commit.**
2. **Local pytest pattern (dev only):** Backend tests use `create_access_token(user.email)` with test DB — not valid for prod without prod `SECRET_KEY`.
3. **No automated mint helper added** — see below.

---

## Exact commands

**Unauth checks only (always safe):**

```bash
cd frontend
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app npm run verify:prod-persistence-auth
```

**With founder test JWT (ops only):**

```bash
cd frontend
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app \
  TWIN_PROD_TEST_JWT="$TWIN_PROD_TEST_JWT" \
  TWIN_PROD_SMOKE_WRITE=1 \
  npm run verify:prod-persistence-auth
```

Equivalent direct script:

```bash
npm run test:prod-authenticated-persistence-smoke
```

---

## Token rotation / removal

- Rotate: log out, log in again, update `TWIN_PROD_TEST_JWT` in shell/1Password
- Remove: `unset TWIN_PROD_TEST_JWT` — smoke runs unauth 401 checks only, exit 0
- Never commit `.env`, tokens, or screenshots with JWT visible

---

## What must never be committed

- `TWIN_PROD_TEST_JWT` value
- `OPS_ADMIN_TOKEN` value
- `SECRET_KEY` / prod passwords
- Login response dumps containing `access_token`

---

## Endpoints covered (authenticated POST smoke)

| Endpoint | Safe action |
|----------|-------------|
| `POST /api/v1/audit-events` | Append-only event `foundation_demo` (allowlisted internal smoke) |
| `POST /api/v1/work-items` | Internal task, `status: open` |
| `POST /api/v1/candidate-role-status` | `needs_feedback` on demo refs |
| `POST /api/v1/review-queue` | `trust_audit_review`, `priority: low` |
| `POST /api/v1/company-feedback` | `draft` comment only |
| `POST /api/v1/candidate-visibility-preferences` | `pilot_visible` prefs |
| `POST /api/v1/export-requests` | `preview_created` export preview |
| `POST /api/v1/request-intake` | `correction_preview`, `open` |

All use demo refs: `demo-candidate-001`, `demo-role-001`, `prod-smoke-<timestamp>`.

---

## Safe demo smoke records

Every record tagged where possible:

- `candidate_id` / `candidate_ref`: `demo-candidate-001`
- `role_context_id` / `role_ref`: `demo-role-001`
- `source`: `twin_internal_prod_smoke`
- `smoke_test`: `true`
- `external_side_effect`: `false`
- No real emails, no PII, no legal claim, no fulfillment, no final decision

---

## No token mint helper added

**Reason:** Production JWT signing requires Railway `SECRET_KEY`. A local mint script would either:

- embed or require prod secrets in operator environment (acceptable only ad-hoc, not in repo), or
- call a new API endpoint (auth weakening / backdoor risk).

Existing pattern: browser login → copy token to env. Backend tests use `create_access_token()` against test DB only.

---

## Test factories (repo reference)

| Location | Pattern |
|----------|---------|
| `backend/tests/test_company_feedback_persistence.py` | `create_access_token(u.email)` + TestClient |
| `backend/tests/test_candidate_role_status.py` | Same |
| `backend/tests/test_admin_migrations_current.py` | Ops admin token, not user JWT |

---

## Launch stance (unchanged)

| Gate | Status |
|------|--------|
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

---

## Related docs

- `docs/AUTHENTICATED_PROD_PERSISTENCE_SMOKE_2026-06-19.md`
- `docs/PRODUCTION_PERSISTENCE_STATUS_2026-06-19.md`
- `docs/DEMO_LOGIN_FOR_FOUNDER.md`
- `docs/FOUNDER_SECRETS_WHERE.md`
