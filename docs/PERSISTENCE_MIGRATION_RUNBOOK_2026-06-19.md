# Persistence Migration Runbook — 2026-06-19

**Branch:** `ops/persistence-health-and-migration-runbook-2026-06-19`  
**Base:** `cursor/phase1-monorepo-scaffold`  
**Baseline:** PRs #204–#209, scaffold HEAD `7c9a5c1`, Railway API `c5aef19`  
**Verifier:** Read-only ops + documented migration chain — no env change, no prod DB mutation.

## Executive summary

| Check | Result |
|-------|--------|
| Repo Alembic head | ✅ `067_request_intake` (chain 060→067) |
| Prod `db_ok` (public-health) | ✅ Expected `true` after Railway deploy |
| Persistence GET unauth | ✅ 401 on all eight endpoints |
| Prod Alembic `current` | ⚠️ Not remotely queryable — confirm via Railway shell |
| Authenticated prod POST smoke | ⏭️ Skipped — no safe test JWT in repo |

**Verdict:** Migrations **060–067** are in repo. Founder/ops must confirm Railway `alembic current` matches **067** before claiming full prod persistence readiness.

---

## 1. Migration chain (repo)

```
059_recruiter_talent_pool_import
  → 060_audit_events_foundation
  → 061_work_items
  → 062_candidate_role_status
  → 063_review_queue
  → 064_company_feedback
  → 065_candidate_visibility_preferences
  → 066_export_requests
  → 067_request_intake (head)
```

Local verification:

```bash
cd backend && alembic heads
# Expected: 067_request_intake (head)
```

---

## 2. Tables introduced (065–067)

| Migration | Table | Purpose |
|-----------|-------|---------|
| `065_candidate_visibility_preferences` | `candidate_visibility_preferences` | Internal visibility state — no external publish |
| `066_export_requests` | `export_requests` | Preview export request records — no fulfillment |
| `067_request_intake` | `request_intake_items` | Append-only human review intake |

Earlier batch (#199–#203): `audit_events`, `work_items`, `candidate_role_status`, `review_queue_items`, `company_feedback_items`.

---

## 3. Railway migration procedure (founder ops)

1. **Pre-check:** `git log -1 --oneline` on deployed branch includes migrations 065–067.
2. **Deploy:** Railway auto-runs `alembic upgrade head` on API service start (verify deploy logs).
3. **Post-check shell:**
   ```bash
   alembic current
   # Expected: 067_request_intake (head)
   ```
4. **Table spot-check (read-only):**
   ```sql
   SELECT COUNT(*) FROM candidate_visibility_preferences;
   SELECT COUNT(*) FROM export_requests;
   SELECT COUNT(*) FROM request_intake_items;
   ```
5. **Rollback stance:** No automatic downgrade in prod. If migration fails, stop deploy, restore from Railway backup per incident runbook — do not `alembic downgrade` on production without founder sign-off.

---

## 4. Public health verification

**URL:** `https://twin-sooty.vercel.app/api/public-health`

| Field | Expected |
|-------|----------|
| `status` | `ok` |
| `db_ok` | `true` |
| `git_commit` / `api_commit` | Matches deployed Railway SHA |

```bash
curl -sS https://twin-sooty.vercel.app/api/public-health | jq '{status,db_ok,api_commit,frontend_commit}'
```

---

## 5. Persistence API auth gate (unauthenticated GET)

All endpoints must return **401** or **403** — never **404** or **500**.

| Endpoint | Methods |
|----------|---------|
| `/api/v1/audit-events` | GET, POST |
| `/api/v1/work-items` | GET, POST, PATCH |
| `/api/v1/candidate-role-status` | GET, POST, PATCH |
| `/api/v1/review-queue` | GET, POST, PATCH |
| `/api/v1/company-feedback` | GET, POST, PATCH |
| `/api/v1/candidate-visibility-preferences` | GET, POST, PATCH |
| `/api/v1/export-requests` | GET, POST |
| `/api/v1/request-intake` | GET, POST, PATCH |

```bash
for ep in audit-events work-items candidate-role-status review-queue company-feedback \
  candidate-visibility-preferences export-requests request-intake; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://twin-sooty.vercel.app/api/v1/$ep")
  echo "$ep → $code"
done
```

---

## 6. Frontend static readiness test

```bash
cd frontend && npm run test:backend-persistence-prod-readiness
```

---

## 7. Launch stance (unchanged)

| Gate | Status |
|------|--------|
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |

---

## 8. Follow-up (UI actions batch)

After this runbook merges:

1. Wire visibility preferences UI POST/PATCH (internal-write copy only)
2. Wire export request UI actions on trust surfaces
3. Wire request intake live counts into recruiter queues
4. Harden work item create/update forms
5. Company feedback safe draft flow
6. Board tracker shipped/blocked state update
