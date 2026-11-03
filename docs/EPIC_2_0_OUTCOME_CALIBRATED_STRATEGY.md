# Epic 2.0 — Outcome-Calibrated Career Strategy & Candidate-Controlled Execution

**Status:** implemented on `cursor/phase1-monorepo-scaffold`  
**Alembic:** `116_outcome_calibrated_execution`  
**Surfaces:** `/dashboard` (Command Center) · `/dashboard/strategy` · `/dashboard/approvals` · `/dashboard/recovery` · `/dashboard/privacy-center`  
**API:** `/api/v1/candidates/me/career-strategy`

## Rule

Orchestration + strategy snapshots / ranking explanations / calibration proposals / execution plans / deletion & privacy jobs / audits.  
No second lifecycle / recommendation / Daily OS / calendar / Career Graph / adaptive memory / approval stores.  
No external-action agent. Internal steps only.

## Chain

lifecycle → objectives → constraints → evidence → history → feedback → calibration proposal → approval → ranking update → execution plan → internal action → result → reflection → outcome → next calibration

## Safety

- Calibration never silent; merge requires candidate approval; revert supported
- Daily OS uses canonical ranking (not a separate ranking)
- ACAL commitments only when approved
- Execution plans internal-only, idempotent, pause/resume/retry/cancel
- Unified deletion runner executes (not preview-only for execute)
- Privacy revocation executes (not flag-only)
- Invalidated/deleted refs excluded from recommendations
- Phase 3 Agent NOT_STARTED
