# Epic 2.5 — Decision-to-Calendar Execution + Capacity Planning — production proof

**Date:** 2026-08-05  
**Branch:** `cursor/phase1-monorepo-scaffold`  
**Product SHA (FE/API/worker ALIGNED):** `f7d6b03b28f041270e3a0c847956371f95c069ff`  
**Alembic:** `121_decision_calendar_capacity_planning` (`is_at_head: true`)  
**CI smoke:** https://github.com/CzechowskiT/twin/actions/runs/30980907753  
**Feature land SHA:** `67ba9fb864ba55d44e4496d63ceb7253ae58c68d` (CI https://github.com/CzechowskiT/twin/actions/runs/30976983255)  
**E2E:** **91/91** — decision_requirement_batch 9 · capacity_internal_availability 7 · microsoft_readonly_consent 9 · feasibility_conflict_proposal 6 · approval_acal_dailyos 10 · progress_effort_followup 5 · ics_history_external_confirm 8 · deletion_privacy_recovery 5 · security 4 · persistence 15 · stance 13  
**Surfaces:** `/dashboard/execution-calendar` · `/dashboard/approvals` · `/dashboard/decision-journal` · `/dashboard/acceptance` · `/dashboard/career`  
**Canonical Daily OS:** `/api/v1/candidates/me/career-copilot/daily` (200, not 404)  
**Stance:** Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · MS write OFF · Phase 3 Agent NOT_STARTED  

## Verdict

**CAREER EXECUTION CALENDAR CUSTOMER-USABLE - CANDIDATE-CONTROLLED CAPACITY AND READ-ONLY AVAILABILITY PLANNING PRODUCTION-READY**

## Proven

Approved decisions generate execution requirements; reject/postpone do not. Explicit weekly budget only (never inferred). Internal availability works without Microsoft credentials. Graph busy-read is consent-gated read-only with synthetic adapter; write scopes absent; MS calendar write OFF. Commitment batches require approval; ACAL receives holds only after approve; reject creates zero ACAL items. Holds/ICS never presented as external booking or confirmation. Progress uses candidate-declared effort (no inferred completion / productivity score). Privacy pause blocks snapshots; evidence invalidation marks requirements stale; deletion soft-deletes history. Cross-user denied. Celery imports `decision_calendar_tasks`.
