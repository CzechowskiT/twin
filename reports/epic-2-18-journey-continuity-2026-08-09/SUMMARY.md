# Epic 2.18 — Candidate Journey Continuity and Safe Resume (2026-08-09)

## Verdict A
CANDIDATE JOURNEY CONTINUITY AND SAFE RESUME CUSTOMER-USABLE — REUSED CANONICAL PATH SESSIONS, MINIMAL SOURCE REFERENCES, REVISION-BOUND RESUME AND APPROVAL-SAFE NON-MUTATING ROUTING PRODUCTION-READY; NO BEHAVIORAL SURVEILLANCE OR CANARY MUTATION

## Product SHA (ALIGNED)
`30c21f654e29621ba28025fbfa950b207af90f42` FE=API=worker

## Alembic
`134_candidate_journey_continuity` (revises `133_candidate_career_pack`)

## Schema
`twin.candidate_journey_session/v1` · PARALLEL_CHECKPOINT_STORE=NONE

## Tests
- Unit: 10/10
- FE guard: ok
- Code/stance E2E A–K: 51/51
- Auth: product 20/20 + stance 7/7 + invariant 4/4
- Regression 216+217+215: 19/19
- Adapter matrix: 48/48
- CI smoke: SUCCESS `31306483529`

## Canary invariant
before/after business-state diff = 0

## Always
REAL_CANDIDATE_USABILITY/VALUE=NOT_EVALUATED
ACTIVATION_IMPACT/RETENTION_IMPACT/ABANDONMENT_REDUCTION=NOT_EVALUATED
Canary Run 1 = BLOCKED_EXTERNALLY_NOT_EXECUTED (not retried)
