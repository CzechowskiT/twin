# Work Items Persistence — 2026-06-18

**Branch:** `backend/work-items-2026-06-18`  
**Routes:** `/recruiter/work-items`, `/company/work-items`  
**API:** `GET/POST/PATCH /api/v1/work-items` (no delete)

## Purpose

Safe persistence for recruiter/company notes and tasks. Every POST/PATCH creates an append-only AuditEvent.

## Test plan

```bash
cd backend && pytest tests/test_work_items.py -q
cd frontend && npm run test:work-items
```

Prod smoke:

```bash
PLAYWRIGHT_ALLOW_PROD_SMOKE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=https://twin-sooty.vercel.app npm run test:work-items-browser
```

## Rollout

**PILOT** — Public launch **NO-GO**.
