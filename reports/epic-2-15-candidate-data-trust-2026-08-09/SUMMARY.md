# Epic 2.15 — Candidate Data Trust, Reconciliation and Canonical Change Control (2026-08-09)

## Verdict A
CANDIDATE DATA TRUST CONTROLS, RECONCILIATION AND CHANGE CONTROL CUSTOMER-USABLE — PROVENANCE-PRESERVING POST-COMMIT CONFLICT REVIEW, CANDIDATE-APPROVED IMPACT-PREVIEWED REPAIR AND CONFLICT-SAFE UNDO PRODUCTION-READY; CANARY CONTROL PLANE UNCHANGED

## Product SHA (ALIGNED)
`d21ba7661b8cb3a1dc08e1b91975a3743158e639` FE=API=worker

## Alembic
`131_candidate_data_trust` (revises `130_real_canary_candidate_designation`)

## Schema
`twin.candidate_data_trust/v1`

## Tests
- Unit: 5/5 (`test_epic_215_candidate_data_trust.py`)
- Import+search regression: 11/11 (215+213)
- FE guard: ok
- Code/stance E2E: 39/39
- Auth E2E: product 18/18 + stance 7/7 + canary-invariant 4/4
- CI smoke: SUCCESS `31300519946`

## Canary invariant
before/after business-state diff = 0 (designation_count=0, READY_INACTIVE, PREPARED_NOT_EXECUTED, caps=0)

## Always
REAL_CANDIDATE_COMPREHENSION/USABILITY/VALUE/ADOPTION/RETENTION=NOT_EVALUATED  
PUBLIC_PRODUCT_LAUNCH=NO_GO  
Canary Run 1 = BLOCKED_EXTERNALLY_NOT_EXECUTED (not retried)
