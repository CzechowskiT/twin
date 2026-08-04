# Epic 1.9 — Unified Career Lifecycle Command Center

**Status:** implemented on `cursor/phase1-monorepo-scaffold`  
**Alembic:** `115_unified_career_lifecycle`  
**Surfaces:** `/dashboard` (Command Center) · `/dashboard/history` · `/dashboard/search` · `/dashboard/approvals` · `/dashboard/recovery` · `/dashboard/privacy-center`  
**API:** `/api/v1/candidates/me/career-lifecycle`

## Rule

Orchestration only — refs/phase/events/focus/findings/approvals/metadata. No second profile/graph/Daily OS/calendar/evidence/application/interview/offer/transition stores.

## Safety

- No silent material phase change (approval required)
- Focus never deletes other processes
- No bundled approvals
- Search candidate-scoped
- Privacy pause propagates (audited, not silent)
- Phase 3 Agent NOT_STARTED
