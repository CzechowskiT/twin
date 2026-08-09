# Epic 2.17 — Candidate-Controlled Career Pack (2026-08-09)

## Verdict A
CANDIDATE-CONTROLLED PORTABILITY AND SELECTIVE DISCLOSURE PACK CUSTOMER-USABLE — FIELD-LEVEL CONSENT, EXACT RECIPIENT-FACING PREVIEW, PROVENANCE-PRESERVING GENERATION AND PRIVATE OWNER-ONLY DOWNLOAD PRODUCTION-READY; NO EXTERNAL DELIVERY OR CANARY MUTATION

## Product SHA (ALIGNED)
`42d8d7249a6080243d909526422fa5445a79fa65` FE=API=worker

## Alembic
`133_candidate_career_pack` (revises `132_candidate_path_readiness`)

## Schema
`twin.candidate_career_pack/v1`

## Tests
- Unit: 6/6
- FE guard: ok
- Code/stance E2E A–J: 46/46
- Auth: product 25/25 + stance 7/7 + invariant 4/4
- Import/search/path-readiness regression: 19/19
- CI smoke: SUCCESS `31305298325`

## Canary invariant
before/after business-state diff = 0

## Always
REAL_CANDIDATE_USABILITY/VALUE/ADOPTION/RETENTION=NOT_EVALUATED
RECIPIENT_DELIVERY=NOT_PERFORMED
RECIPIENT_OPEN_OR_VIEW=NOT_TRACKED
Canary Run 1 = BLOCKED_EXTERNALLY_NOT_EXECUTED (not retried)
