# Epic 2.3 — Search Outcome Intelligence, Funnel Learning & Strategy Calibration

**Status:** implemented on `cursor/phase1-monorepo-scaffold`  
**Alembic:** `119_search_outcome_intelligence`  
**Surfaces:** `/dashboard/search-outcomes` · `/dashboard/approvals` · `/dashboard/search-strategy` · `/dashboard/career`  
**API:** `/api/v1/candidates/me/search-outcomes`  
**Canonical Daily OS:** `/api/v1/candidates/me/career-copilot/daily` (+ `/daily-os/brief`)

## Rule

Candidate-specific funnel + attribution + calibration on refs only.  
Reuse Search Lab / OI / Epic 2.0 ranking. No second stores. No fabricated benchmarks. Calibration applies only after approval; reject/revert behave correctly.

## Safety

- No silent stage upgrades or weight changes
- Feedback ≠ offer; package approval ≠ submission
- EXTERNAL_CONFIRMED requires source confirmation flag
- Denominators disclosed; benchmarks NOT_PROVIDED
- Archived cycles do not spawn tasks
- Evidence deletion marks thesis/attribution stale
- Phase 3 Agent NOT_STARTED
