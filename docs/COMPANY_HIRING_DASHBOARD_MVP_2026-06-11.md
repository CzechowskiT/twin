# Company hiring dashboard MVP

**Date:** 2026-06-11  
**Route:** `/company/dashboard`  
**API:** `GET /api/v1/company/hiring-dashboard`

## Purpose

Executive snapshot for employer workspaces — roles, pipeline segments, team tokens. Honest pilot metrics only; no revenue, time-to-hire, or public launch claims.

## Verification

```bash
cd backend && python3 -m pytest tests/test_company_hiring_dashboard.py -q
cd frontend && npm run test:company-hiring-dashboard-mvp
cd frontend && npm run build
```

Launch stance: **NO-GO** unchanged.
