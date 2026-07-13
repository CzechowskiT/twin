# Data lifecycle dry-run engine (2026-07-13)

> **Mode:** DRY-RUN ONLY — no production writes

## Engine

`frontend/scripts/lib/data-lifecycle-dry-run-engine.ts` — builds phased plan:

1. **export** — candidate trust events  
2. **anonymize** — referrals (destructive)  
3. **purge** — recruiter audit (destructive, pilot-only table)  
4. **rollback_check** — alembic head verification  

## Guards

- Blocks when `LIVE`, `PRODUCTION_WRITE`, `STRIPE_LIVE`, or `ATS_WRITE` env flags set  
- Requires export step before destructive phases  
- Tests: `frontend/scripts/data-lifecycle-dry-run-engine.test.ts`

## Operator usage

```bash
cd frontend && npx tsx scripts/data-lifecycle-dry-run-engine.test.ts
```

**Not wired to Celery** — planning artifact only until founder approves retention policy.
