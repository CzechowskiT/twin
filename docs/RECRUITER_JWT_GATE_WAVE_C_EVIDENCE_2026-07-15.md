# Recruiter JWT Gate — Wave C Evidence (2026-07-15)

> **Stance:** Launch **NO-GO** · Gate F **PENDING** · Wave C JWT gate **GREEN (branch)**  
> **Branch:** `feat/recruiter-jwt-gate-wave-c` → `cursor/phase1-monorepo-scaffold`  
> **Baseline scaffold HEAD:** `0b27c08c2e0108c01351d5d1d01a7a9ca196559d`  
> **Prod FE @ baseline:** `0b27c08c` · **Prod API @ baseline:** `ae14bfb58fc0c2db56a6fa0f417ca41c534b7960` · **DB head:** `077`

---

## Summary

Wave C closes the recruiter pilot auth gap by introducing a **canonical recruiter session JWT** (backend-authoritative HS256 with `iss`/`aud`/`role`/`tenant`/`nbf`/`exp`), a **`POST /api/v1/auth/recruiter/session`** exchange endpoint, removal of **query-string tokens** on recruiter API routes, and frontend proxy/gate updates so JWT travels only in **`Authorization: Bearer`**.

O7 DR re-drill remains **BLOCKED** (no `RAILWAY_TOKEN`/`DATABASE_PUBLIC_URL` in agent env). R-019 self-service delete API is **on branch**; prod disposable-account E2E remains **BLOCKED** (`TWIN_PROD_TEST_JWT` UNSET).

---

## Auth contract

| Claim / rule | Value |
|--------------|-------|
| Algorithm allowlist | `HS256` only |
| Issuer (`iss`) | `twin-api` |
| Audience (`aud`) | `twin-recruiter` |
| Role (`role`) | `recruiter` |
| Tenant (`tenant`) | company slug — **required**, no default |
| `sub` | company slug |
| `nbf` / `exp` | required numeric |
| Verification | `backend/app/core/recruiter_jwt.py` — **no decode-only auth** |
| Exchange | `POST /api/v1/auth/recruiter/session` `{ access_token, company_slug }` |
| TTL | `recruiter_jwt_expire_minutes` (default 480) |

---

## Threat model

| Threat | Mitigation | Status |
|--------|------------|--------|
| alg=none / wrong alg | `algorithms` allowlist HS256 only | CLOSED |
| Token in query/logs/analytics | Query `token` removed from BE recruiter routes; proxy gate rejects missing Bearer | CLOSED |
| Default / client-controlled tenant | JWT `tenant` authoritative; slug mismatch → 403 | CLOSED |
| Candidate JWT → recruiter surface | Separate aud/role; existing RBAC smoke retained | CLOSED |
| Cross-tenant slug override | `tenant_mismatch` on query slug ≠ JWT tenant | CLOSED |
| Stale session flash | Persona gate + JWT expiry UX clear (same pattern as candidate) | CLOSED |
| Pilot token leakage in URL | Invite may carry token once; exchange → JWT; API calls header-only | PARTIAL (invite URL one-time still supported for onboarding) |

---

## O7 (LB-201)

| Item | Status | Evidence |
|------|--------|----------|
| Post-scaffold DR re-drill | **BLOCKED** | `RAILWAY_TOKEN`/`DATABASE_PUBLIC_URL` UNSET in agent env — founder runbook `docs/O7_RESTORE_DRILL_RUNBOOK_2026-06-11.md` |
| Prior drill | PASS | `docs/BACKUP_RESTORE_DRILL_LOG.md` 2026-06-01 |

---

## R-019 (LB-005 / LB-304)

| Item | Status | Evidence |
|------|--------|----------|
| API `POST /candidates/me/delete-account` | **FIXED (branch)** | `backend/app/api/candidates.py`, `test_candidate_account_deletion.py` 6 PASS |
| Frontend live panel | **FIXED (branch)** | `candidate-account-delete-live-panel.tsx`, guard test |
| Prod disposable-account E2E | **BLOCKED** | `TWIN_PROD_TEST_JWT` UNSET — never `demo@twin.career` |

---

## Traceability matrix

| Req | Implementation | Test |
|-----|----------------|------|
| JWT mint/verify | `backend/app/core/recruiter_jwt.py` | `test_recruiter_jwt_gate.py` |
| Central resolver | `backend/app/core/recruiter_auth.py` | tenant_mismatch + legacy header |
| Exchange endpoint | `backend/app/api/auth.py` `/recruiter/session` | `test_exchange_recruiter_session_endpoint` |
| No query token | `backend/app/api/recruiter.py` | `test_recruiter_inbox_rejects_query_token` |
| FE session | `frontend/src/lib/recruiter-jwt.ts` | guard test §6 |
| Proxy gate | `frontend/src/lib/recruiter-inbox-api-route.ts` | guard test §4 |
| Persona gate | `persona-workspace-gate.tsx` | guard test §8 |
| E2E Wave C | `e2e/founder-wave-bc-prod-smoke.spec.ts` | JWT exchange seed |

---

## Tests / smoke

| Check | Result |
|-------|--------|
| `pytest tests/test_recruiter_jwt_gate.py` | 7 PASS |
| `pytest tests/test_candidate_account_deletion.py` | 6 PASS |
| `npm run test:recruiter-jwt-gate-wave-c-guard` | 8/8 PASS |
| `npm run build` (frontend) | PASS |
| CI PR #488 | **PASS** (backend-smoke, frontend-build, security-regression, Vercel) |
| Prod merge SHA | `b98499aea615182b58d0f5099fa85665d604bfd0` |
| Prod `verify:production-v3:077` | **PASS** |
| Prod `probe:prod-public` ×2 | **220/220 PASS** (110+110) |
| Prod `/auth/recruiter/session` | **PASS** (401 on invalid token — endpoint live) |
| `/demo` regression | **PASS** (HTTP 200) |

---

## Hard bans (unchanged)

- Launch GO: **NO**
- Gate F YES: **NO**
- Phase 3B flip: **NO**
- Demo changes: **none**

---

## Wave C decision

| Signal | Verdict |
|--------|---------|
| JWT gate implementation | **GREEN** |
| O7 re-drill | **RED (blocked)** |
| R-019 prod smoke | **AMBER (branch ready, prod JWT unset)** |
| **Overall Wave C batch** | **AMBER** |

**Founder action (max 1):** Run O7 staging restore drill per `docs/O7_RESTORE_DRILL_RUNBOOK_2026-06-11.md` OR provision `TWIN_PROD_TEST_JWT` for disposable R-019 prod smoke — not both required for JWT gate merge.
