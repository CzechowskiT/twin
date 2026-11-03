# Epic 1.7 — Interview & Decision Copilot

**Branch:** `cursor/phase1-monorepo-scaffold`  
**Alembic:** `113_interview_decision_copilot`  
**Stance:** Launch NO-GO · Enrollment OFF · Phase 3B BLOCKED · MS write OFF · covert assistance OFF · external negotiation/accept OFF · Phase 3 Agent NOT_STARTED

## Product

Candidate-owned chain:

`application handoff → interview process → stage prep → evidence-backed answers → mock → notes → feedback → next stage → offer analysis → negotiation prep → candidate-declared decision`

TWIN prepares/practices/analyzes. Never invents stories/feedback/offers. Never covert live assistance. Never external acts.

## Surfaces

| Surface | Path |
|---|---|
| FE | `/dashboard/interview-decision` (+ legacy `/dashboard/interview-prep`) |
| API | `GET /api/v1/candidates/me/interview-decision` |
| Process / stages / answers / mocks / events / feedback | under `.../processes/{id}/…` |
| Offers / compare / memos / declare | `.../offers`, `.../memos/{id}/declare` |
| Snapshot integrity | `.../snapshot-integrity` |

## Proof

- `pytest tests/test_interview_decision.py`
- `scripts/interview-decision-authenticated-e2e.py` (≥220)
- Topology expects Alembic `113_interview_decision_copilot`

## Residual Epic 1.6

Application Studio remains live; handoff via `workspace_id` freezes immutable submitted snapshot; Daily OS `/daily-os/brief` reused.
