# Epic 2.16 — Candidate-Selected Path Readiness and Guided Resolution Routing (2026-08-09)

## Verdict A
CANDIDATE-SELECTED PATH READINESS AND GUIDED RESOLUTION ROUTING CUSTOMER-USABLE — DETERMINISTIC REQUIRED-VERSUS-OPTIONAL PRODUCT BLOCKERS, SOURCE-LINKED EXPLANATIONS AND NON-MUTATING ROUTES TO CANONICAL EDITORS PRODUCTION-READY; CANARY CONTROL PLANE UNCHANGED

## Product SHA (ALIGNED)
`1f94f2dd451abb47d927132675fa2e2c7150b046` FE=API=worker

## Alembic
`132_candidate_path_readiness` (revises `131_candidate_data_trust`)

## Schema
`twin.candidate_path_readiness/v1`

## Tests
- Unit: 8/8
- FE guard: ok
- Code/stance E2E A–J: 41/41
- Auth: product 21/21 + stance 7/7 + invariant 4/4
- Import/search/data-trust regression: 19/19
- CI smoke: SUCCESS `31302628681`

## Canary invariant
before/after business-state diff = 0

## Always
REAL_CANDIDATE_COMPREHENSION/USABILITY/VALUE/ADOPTION/RETENTION=NOT_EVALUATED  
Canary Run 1 = BLOCKED_EXTERNALLY_NOT_EXECUTED (not retried)
