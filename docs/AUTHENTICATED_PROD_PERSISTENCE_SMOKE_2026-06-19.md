# Authenticated Production Persistence Smoke — 2026-06-19

**Script:** `frontend/scripts/prod-authenticated-persistence-smoke.test.ts` (12 assertions)  
**Command:** `npm run test:prod-authenticated-persistence-smoke`  
**Wrapper:** `npm run verify:prod-persistence-auth`  
**Auth setup:** `docs/FOUNDER_TEST_AUTH_SMOKE_SETUP_2026-06-19.md`

## Purpose

Safe, non-destructive authenticated production POST smoke for persistence APIs (batch 060–067). Verifies auth gates and, when a founder test JWT is available, append-only internal test records with **no external side effect**.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TWIN_PROD_BASE_URL` | No (default `https://twin-sooty.vercel.app`) | Production frontend base (proxies `/api/v1/*`) |
| `TWIN_PROD_TEST_JWT` | For authenticated POST | Bearer JWT for founder/test account — **never commit** |
| `TWIN_PROD_SMOKE_WRITE` | For POST | Set `1` to enable authenticated POSTs |

## Commands

**Without token (always safe — unauth 401 checks):**

```bash
cd frontend
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app npm run verify:prod-persistence-auth
```

**With safe test token (founder ops only):**

```bash
cd frontend
TWIN_PROD_BASE_URL=https://twin-sooty.vercel.app \
  TWIN_PROD_TEST_JWT="$TWIN_PROD_TEST_JWT" \
  TWIN_PROD_SMOKE_WRITE=1 \
  npm run test:prod-authenticated-persistence-smoke
```

## Endpoints covered

| Endpoint | Methods | Unauth | Auth smoke |
|----------|---------|--------|------------|
| `/api/v1/audit-events` | GET, POST | 401 | POST append-only event |
| `/api/v1/work-items` | GET, POST, PATCH | 401 | POST internal static task |
| `/api/v1/admin/migrations/current` | GET | 401 | Ops admin token only (not user JWT) |
| `/api/v1/candidate-role-status` | GET, POST, PATCH | 401 | POST `needs_feedback` status |
| `/api/v1/review-queue` | GET, POST, PATCH | 401 | POST `trust_audit_review` |
| `/api/v1/company-feedback` | GET, POST, PATCH | 401 | POST `draft` feedback |
| `/api/v1/candidate-visibility-preferences` | GET, POST, PATCH | 401 | POST pilot_visible prefs |
| `/api/v1/export-requests` | GET, POST | 401 | POST `preview_created` export |
| `/api/v1/request-intake` | GET, POST, PATCH | 401 | POST `correction_preview` intake |

## Safe payloads (summary)

All records use demo refs: `demo-candidate-001`, `demo-role-001`, `prod-smoke-<timestamp>` subject IDs.

- **AuditEvent:** `event_type: foundation_demo`, `target_type: demo_target`, metadata `{ scope: twin_internal_prod_smoke, item_kind: smoke_test }`
- **WorkItem:** `item_type: task`, `persona_scope: recruiter`, `status: open`
- **CandidateRoleStatus:** `status: needs_feedback` (never hired/rejected/offer_sent)
- **ReviewQueue:** `item_kind: trust_audit_review`, `priority: low`
- **CompanyFeedback:** `status: draft`, internal comment only
- **VisibilityPreference:** pilot_visible / manual_review_required
- **ExportRequest:** `candidate_export_preview`, `status: preview_created`
- **RequestIntake:** `correction_preview`, `status: open`

## Expected responses

- Unauthenticated GET → **401** (never 404/500)
- Authenticated POST → **201** with `external_side_effect: false` where serialized
- Authenticated GET → **200** list payloads
- Response bodies must not contain forbidden success copy (see below)

## Skipped authenticated smoke

When `TWIN_PROD_TEST_JWT` is unset:

- Tests 1–8, 12 run (static + unauth 401 + admin migrations + public-health + skip convention)
- Tests 9–11 skip with message: `SKIPPED authenticated POST smoke — TWIN_PROD_TEST_JWT not configured`
- Exit code **0** (readiness convention — non-failing)

When token set but `TWIN_PROD_SMOKE_WRITE` unset:

- Test 5 skips: `SKIPPED authenticated POST — set TWIN_PROD_SMOKE_WRITE=1`

## Forbidden actions

- No email send
- No ATS calls
- No legal/revoke/delete/KYC endpoints
- No hardcoded token in repo
- No token printed to stdout

## Forbidden copy (must not appear in responses)

sent successfully, email sent, verified successfully, GDPR compliant, persisted successfully, production write enabled, export fulfilled, hired, rejected, offer sent

## Cleanup / retention

Smoke rows are append-only internal test records. No automatic cleanup — acceptable for low-volume founder smoke. Human review required; records tagged via smoke metadata/subject refs.

## Related docs

- `docs/FOUNDER_TEST_AUTH_SMOKE_SETUP_2026-06-19.md`
- `docs/PRODUCTION_PERSISTENCE_STATUS_2026-06-19.md`
- `docs/PERSISTENCE_MIGRATION_RUNBOOK_2026-06-19.md`
- `docs/PROD_HEALTH_COMMIT_INTERPRETATION_2026-06-19.md`
- `docs/ALEMBIC_PROD_HEAD_VERIFICATION_2026-06-19.md`

## Launch stance (unchanged)

| Gate | Status |
|------|--------|
| Public launch | **NO-GO** |
| P0 performance | **OPEN** |
| Phase 3B | **HARD BLOCKED** |
