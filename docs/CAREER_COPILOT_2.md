# Career Copilot 2.0 — architecture

**Product:** Persistent AI Career Advisor (candidate-first primary)  
**Surface:** `/dashboard/career` (elevated; not an orphan)  
**API:** `/api/v1/candidates/me/career-copilot*`  
**Alembic:** `107_career_copilot_2`  
**Verdict target:** `CAREER COPILOT 2.0 CUSTOMER-USABLE — PERSISTENT AI CAREER ADVISOR PRODUCTION-READY`

## Principles

- Not a chatbot; not motivational fluff.
- Every claim: **FACT | INFERENCE | SUGGESTION | UNKNOWN**.
- Never invent employers, salary bands, or market demand.
- Never employment decisions; never protected attributes; never therapy/medical/legal/financial advice.
- AI kill-switch / outage → `rules_v1` fallback; journey never blocked.
- Human override (accept/reject/restart) preserved across refresh.

## Canonical models

| Table | Role |
|-------|------|
| `candidate_career_graphs` | Persistent career graph JSON |
| `candidate_career_directions` | Direction paths + override status |
| `candidate_career_goals` | Goals + history |
| `candidate_career_actions` | Roadmap horizons |
| `candidate_copilot_recommendations` | Recommendation memory |
| `candidate_career_decisions` | Decision simulator snapshots |
| `candidate_career_reflections` | Milestone reflections |

Reuses: `candidate_career_compass` (brief), Candidate Intelligence (read-only signals).

## Service

`backend/app/services/career_copilot.py` — orchestrator for WS1–WS13.

## Stance (frozen)

Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · Phase 3 Career Agent **not started** · invite-only · KPI analytics `kpi_excluded=true`.

## Operator runbook

1. Candidate opens `/dashboard/career` → Copilot panel loads aggregate.
2. Refresh rebuilds graph/directions without wiping rejected paths.
3. If AI degraded: banner shows; rules engine still works.
4. Support: do not invent salary advice; point to UNKNOWN labels.
