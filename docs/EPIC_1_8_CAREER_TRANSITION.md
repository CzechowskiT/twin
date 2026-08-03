# Epic 1.8 — Career Transition, First 90 Days & Outcome Learning

**Status:** implemented on `cursor/phase1-monorepo-scaffold`  
**Alembic:** `114_career_transition_outcome_learning`  
**Surfaces:** FE `/dashboard/career-transition` · API `/api/v1/candidates/me/career-transition`

## Chain

`candidate-declared decision → transition workspace → pre-start → resignation (draft) → handover → clarification → first day/week → 30/60/90 (AI_DRAFT until approve) → check-ins → outcomes → prediction-vs-outcome → versioned calibration (+revert) → Career Graph (candidate approval) → adaptive memory audit → next cycle`

## Safety (always OFF)

- Workplace / email / Slack / Teams / HRIS monitoring  
- External resignation, employer comms, negotiation send, offer accept action  
- Mental-health / manager-sentiment inference  
- Silent calibration overwrite; Career Graph without approval  
- Interpretation labeled employer-confirmed  
- Transition from inferred acceptance (requires `accept_intent` / `negotiate_intent` + `candidate_declared` provenance)  
- Phase 3 Autonomous Career Agent  

## Reuses

Interview Decision memos/offers, Career Evidence, Daily OS brief, Acceptance Calendar, recommendation calibration versioning (transition-scoped).
