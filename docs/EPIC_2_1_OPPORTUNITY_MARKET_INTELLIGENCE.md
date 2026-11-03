# Epic 2.1 — Evidence-Backed Opportunity Discovery & Market Intelligence

**Status:** implemented on `cursor/phase1-monorepo-scaffold`  
**Alembic:** `117_opportunity_market_intelligence`  
**Surfaces:** `/dashboard/jobs` (compatible + Opportunity Intelligence panel) · `/dashboard/strategy` · `/dashboard/application-studio`  
**API:** `/api/v1/candidates/me/opportunity-intelligence`

## Rule

Normalize/watch/compare/market signals as orchestration on canonical `jobs` + Epic 2.0 ranking refs.  
No second Job/Evidence/Application/Daily OS/ranking stores. No external apply / prohibited scraping.

## Safety

- SSRF + active-content blocked on ingest
- Salary/demand/activity UNKNOWN unless observed — never fabricated
- Studio handoff includes `stale_warning`
- Refresh idempotent
- Fit recomputed on evidence invalidation (no strong fit without evidence)
- Phase 3 Agent NOT_STARTED
