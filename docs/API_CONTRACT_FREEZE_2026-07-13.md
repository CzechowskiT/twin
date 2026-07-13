# API contract freeze — Wave C3–C5 + hardening batch (2026-07-13)

> **Freeze level:** PILOT · **Breaking changes:** banned until Gate F closure

## Frozen paths (additive-only until smoke PASS)

| Method | Path | Owner PR |
|--------|------|----------|
| GET/PATCH | `/api/v1/recruiter/notification-preferences` | #452 |
| GET/POST/DELETE | `/api/v1/recruiter/saved-views` | #453 |
| GET | `/api/v1/recruiter/activity-timeline` | #454 |
| GET | `/api/v1/candidates/me/activity-timeline` | #455 |

## Rules

1. No route removals or renames without version bump  
2. OpenAPI snapshot: `backend/tests/snapshots/wave_api_contract_paths.txt`  
3. Guard: `npm run test:openapi-contract-guard`  
4. Hardening PRs #456–#460: **no new API routes**

## Verification

`npm run verify:production-v3` includes contract freeze doc check.

**Status:** FROZEN for merge train rehearsal — implementation changes require smoke re-run.
