# Alembic Production Head Verification — 2026-06-19

**Branch:** `ops/prod-persistence-auth-smoke-and-health-clarity-2026-06-19`  
**Expected repo head:** `068_placement_events_foundation` (as of 2026-06-21 placement events batch)

## Purpose

Read-only verification that Railway production database Alembic revision matches repo head after persistence batch #204–#209.

## Migration chain (060→068)

```
059_recruiter_talent_pool_import
  → 060_audit_events_foundation
  → 061_work_items
  → 062_candidate_role_status
  → 063_review_queue
  → 064_company_feedback
  → 065_candidate_visibility_preferences
  → 066_export_requests
  → 067_request_intake
  → 068_placement_events_foundation (head)
```

Local verification:

```bash
cd backend && alembic heads
# Expected: 068_placement_events_foundation (head)
```

## Production verification paths

### A. Railway shell (preferred)

```bash
# In Railway API service shell (read-only)
alembic current
# Expected: 068_placement_events_foundation (head)

# SQL spot-check (read-only)
SELECT version_num FROM alembic_version;
# Expected: 068_placement_events_foundation
```

### B. Admin API endpoint (ops token required)

```bash
curl -sS -H "Authorization: Bearer $OPS_ADMIN_TOKEN" \
  "https://<railway-api-host>/api/v1/admin/migrations/current" | jq .
```

Expected response shape:

```json
{
  "current_revision": "068_placement_events_foundation",
  "head_revision": "068_placement_events_foundation",
  "head_revisions": ["068_placement_events_foundation"],
  "is_at_head": true,
  "read_only": true
}
```

- Unauthenticated → **401**
- No DB secrets in response
- Read-only — no migration mutation

### C. Table existence (read-only SQL)

```sql
SELECT COUNT(*) FROM candidate_visibility_preferences;
SELECT COUNT(*) FROM export_requests;
SELECT COUNT(*) FROM request_intake_items;
SELECT COUNT(*) FROM placement_events;
```

## If current < head

1. **Stop** — do not run ad-hoc writes on production.
2. Check Railway deploy logs for failed `alembic upgrade head`.
3. Confirm deployed branch includes migrations 065–067.
4. Re-deploy API service after fixing migration error.
5. If migration partially applied — founder incident per `docs/PERSISTENCE_MIGRATION_RUNBOOK_2026-06-19.md`.
6. **Do not** `alembic downgrade` on production without founder sign-off.

## Rollback / restore note

No automatic downgrade in prod. Failed migration → stop deploy, restore from Railway backup per incident runbook — never restore over production from this verification script.

## Safety

- Read-only verification only — no env change, no prod DB mutation from this doc.
- public-health `db_ok: true` confirms connectivity, **not** revision level.

## Evidence log (append-only)

| Field | Value |
|-------|-------|
| **date** | 2026-06-20 |
| **method** | authenticated admin migrations endpoint |
| **endpoint** | `/api/v1/admin/migrations/current` |
| **production API host** | `https://twin-production-bcd9.up.railway.app` |
| **expected head** | `067_request_intake` |
| **actual current_revision** | `067_request_intake` |
| **actual head_revision** | `067_request_intake` |
| **actual head_revisions** | `["067_request_intake"]` |
| **is_at_head** | `true` |
| **read_only** | `true` |
| **operator** | founder/operator |
| **token handling** | `OPS_ADMIN_TOKEN` used locally only — not printed, not committed |
| **write behavior** | no DB writes |
| **public-health context** | `status`: ok · `db_ok`: true · `frontend_commit` (previously observed): `9e9f2b382e1a4fb9b5a6485a41dfba9676cd9540` · `api_commit` / `backend_git_commit` (previously observed): `1622b97867e0a02451437ddd5f502e9f0c8328c6` · note: public-health commit alignment is separate from Alembic DB head confirmation |
| **conclusion** | production Alembic head confirmed |
| **launch stance** | **NO-GO** |
| **P0 performance** | **OPEN** |
| **Phase 3B** | **HARD BLOCKED** |

Authenticated persistence smoke was already **PASS** before this entry (11 pass, 0 fail, 1 skip). No secrets recorded in this log.

| Field | Value |
|-------|-------|
| **date** | 2026-06-21 |
| **method** | authenticated admin migrations endpoint |
| **endpoint** | `/api/v1/admin/migrations/current` |
| **production API host** | `https://twin-sooty.vercel.app` (proxied to Railway API) |
| **expected head** | `068_placement_events_foundation` |
| **actual current_revision** | `068_placement_events_foundation` |
| **actual head_revision** | `068_placement_events_foundation` |
| **actual head_revisions** | `["068_placement_events_foundation"]` |
| **is_at_head** | `true` |
| **read_only** | `true` |
| **operator** | founder/operator |
| **token handling** | `OPS_ADMIN_TOKEN` used locally only — not printed, not committed |
| **write behavior** | read-only check — no DB writes |
| **conclusion** | production Alembic head confirmed for placement_events foundation |
| **launch stance** | **NO-GO** |
| **P0 performance** | **OPEN** |
| **Phase 3B** | **HARD BLOCKED** |

Authenticated persistence smoke rerun **PASS** same date (11 pass, 0 fail, 1 skip). See `docs/PLACEMENT_EVENTS_PROD_VERIFICATION_2026-06-21.md`.

## Tests

```bash
cd backend && pytest tests/test_admin_migrations_current.py -q
cd frontend && npm run test:backend-persistence-prod-readiness
```

## Launch stance (unchanged)

| Gate | Status |
|------|--------|
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |
