# Epic 2.2 — Career Market Radar, Search Strategy Lab & Evidence-Based Job Search Portfolio

**Status:** implemented on `cursor/phase1-monorepo-scaffold`  
**Alembic:** `118_career_market_radar_search_strategy`  
**Surfaces:** `/dashboard/search-strategy` · `/dashboard/approvals` · `/dashboard/jobs` · `/dashboard/strategy`  
**API:** `/api/v1/candidates/me/search-strategy`

## Rule

Orchestrate search strategy / role thesis / portfolio / experiments / cycles on top of Epic 2.1 opportunities + Epic 2.0 canonical ranking.  
No second opportunity / ranking / Daily OS / Evidence / Application stores. No external apply / whole-market claims / silent weight changes.

## Safety

- Strategy activates only after candidate approval
- Experiments never silently change ranking weights
- Observed-source wording only — never whole-market or fabricated conversion
- Archived cycles set `spawns_tasks=false`
- Evidence deletion invalidates role theses (stale guard)
- Phase 3 Agent NOT_STARTED
