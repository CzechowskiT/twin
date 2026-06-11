# Company pipeline quality metrics MVP

**Date:** 2026-06-11  
**Route:** `/company/pipeline`  
**API:** `GET /api/v1/company/pipeline-quality`

## Purpose

Executive, company-scoped pipeline quality by role — real workspace data only. No time-to-hire, hire conversion, or public launch claims.

## Metrics

Per role and company totals:

- Pipeline segments: `in_review`, `accepted`, `invited`, `rejected`, `on_hold`
- Quality: average match score, missing-data count, verification-risk count
- Optional recruiter activity when audit trail ships (`recruiter_activity: null` today)

## Verification

```bash
cd backend && python3 -m pytest tests/test_company_pipeline_quality.py -q
cd frontend && npm run test:company-pipeline-quality-metrics
cd frontend && npm run test:trust-language-guard && npm run test:pii-data-visibility
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

Launch stance: **NO-GO** unchanged (`docs/PUBLIC_LAUNCH_READINESS_MATRIX_2026-06-02.md`).
