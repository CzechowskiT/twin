# Epic 2.21 — Candidate Workspace Cohesion and Context-Preserving Handoffs (2026-08-09)

## Verdict A
CANDIDATE WORKSPACE COHESION AND CONTEXT-PRESERVING HANDOFFS CUSTOMER-USABLE — REUSED CANONICAL SESSIONS, CANDIDATE-BOUND REVISION-SAFE CONTEXT ENVELOPES AND NON-MUTATING ALLOWLISTED ROUTING PRODUCTION-READY; NO PARALLEL STATE, BEHAVIORAL SURVEILLANCE OR EXTERNAL ACTION

## Product SHA (ALIGNED)
`397307a3ee28a2e8dbe9fcd52aff2b81ac4c038a` FE=API=worker

## Alembic
`135_candidate_career_pack_share` (no 136 — Fernet envelopes only)

## Schemas
`twin.candidate_handoff_registry/v1` · `twin.candidate_handoff_context/v1` · PARALLEL_HANDOFF_OR_CHECKPOINT_STORE=NONE

## Tests
- Unit: 5/5
- FE guard: ok
- Code/stance E2E A–K: 36/36
- Auth: product 19/19 + stance 7/7 + security 4/4 + invariant 4/4
- CI smoke: SUCCESS `31315481639`

## Canary invariant
before/after business-state diff = 0

## Always
REAL_CANDIDATE_USABILITY/VALUE=NOT_EVALUATED
Canary Run 1 = BLOCKED_EXTERNALLY_NOT_EXECUTED (not retried)
