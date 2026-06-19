# Backend Persistence Production Verification — 2026-06-19

**Branch:** `ops/backend-persistence-verification-2026-06-19`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Repo HEAD at verification:** `2633bd3681e2e6911472965a7b7410a07f99edfc`  
**Verifier:** Read-only ops pass — no deploy, no env change, no auth brute-force.

## Executive summary

| Check | Result |
|-------|--------|
| Scaffold HEAD matches prod `git_commit` | ✅ `2633bd3` |
| `frontend_commit` vs `api_commit` aligned | ✅ Same SHA |
| `db_ok` | ✅ `true` |
| Alembic repo head | ✅ `064_company_feedback` (chain 060→064) |
| Prod Alembic `current` | ⚠️ Not remotely queryable — document expected head |
| Persistence GET unauth (401/403, not 404/500) | ✅ All five endpoints return **401** |
| Authenticated prod POST smoke | ⏭️ Skipped — no safe test JWT in repo |

**Verdict:** Backend persistence batch #199–#203 is **deployed and aligned** on production. Migration head **064** must be confirmed on Railway via deploy logs or `alembic current` in ops shell.

---

## 1. Scaffold HEAD

```
2633bd3681e2e6911472965a7b7410a07f99edfc
Merge pull request #203 from CzechowskiT/backend/company-feedback-2026-06-18
```

Matches `origin/cursor/phase1-monorepo-scaffold`.

---

## 2. Public health (`GET /api/public-health`)

**URL:** `https://twin-sooty.vercel.app/api/public-health`  
**HTTP:** 200

| Field | Value |
|-------|-------|
| `status` | `ok` |
| `db_ok` | `true` |
| `git_commit` | `2633bd3681e2e6911472965a7b7410a07f99edfc` |
| `frontend_commit` | `2633bd3681e2e6911472965a7b7410a07f99edfc` |
| `api_commit` | `2633bd3681e2e6911472965a7b7410a07f99edfc` |

Frontend and API commits are **in sync** with scaffold HEAD and merge #203.

---

## 3. Persistence batch merges (#199–#203)

| PR | Feature | Migration |
|----|---------|-----------|
| #199 | AuditEvent foundation | `060_audit_events_foundation` |
| #200 | Work items | `061_work_items` |
| #201 | Candidate role status | `062_candidate_role_status` |
| #202 | Review queue | `063_review_queue` |
| #203 | Company feedback | `064_company_feedback` |

---

## 4. Alembic migration chain (repo)

Local `alembic heads`:

```
064_company_feedback (head)
```

Chain: `059_recruiter_talent_pool_import` → `060` → `061` → `062` → `063` → `064`.

**Production limitation:** Railway Alembic `current` is not exposed via public-health. Expected prod state after successful deploy of #203: **`064_company_feedback`**. Founder/ops should confirm via Railway shell if tables `company_feedback_items`, `review_queue_items`, etc. exist.

---

## 5. Unauthenticated GET behavior

Expected: **401** or **403** when auth required — never **404** or **500**.

| Endpoint | HTTP (prod, no auth) |
|----------|-------------------|
| `GET /api/v1/audit-events` | **401** |
| `GET /api/v1/work-items` | **401** |
| `GET /api/v1/candidate-role-status` | **401** |
| `GET /api/v1/review-queue` | **401** |
| `GET /api/v1/company-feedback` | **401** |

All endpoints are **registered and auth-gated** — no routing gaps.

---

## 6. Authenticated prod smoke

**Not run.** Repo has test JWT patterns for local pytest only (`create_access_token` in backend tests). No safe production credentials. Document as limitation for POST verification.

**Safe next step:** Run authenticated GET/POST in staging or with founder test account after visibility/export/intake slices ship.

---

## 7. Launch stance (unchanged)

| Gate | Status |
|------|--------|
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

---

## 8. Follow-up slices (this batch)

After this verification doc merges:

1. Candidate visibility preference store  
2. Read-only export request endpoint  
3. Request intake append queue  
4. Wire work items + review queue UI to live APIs  
5. Wire company feedback UI to live API  

---

## Test plan

```bash
cd frontend
npm run test:backend-persistence-prod-readiness
```
