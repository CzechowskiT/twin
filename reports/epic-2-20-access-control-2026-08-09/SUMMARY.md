# Epic 2.20 — Candidate Access and Sharing Control Center (2026-08-09)

## Verdict A
CANDIDATE ACCESS AND SHARING CONTROL CENTER CUSTOMER-USABLE — CANONICAL ACTIVE-GRANT INVENTORY, SOURCE-OWNED EXPLICIT REVOCATION AND PRIVACY-PRESERVING ACCESS TRANSPARENCY PRODUCTION-READY; NO PARALLEL TOKEN STORE, BEHAVIORAL TRACKING OR CANARY MUTATION

## Product SHA (ALIGNED)
`5c5498552d247f33a6ad7199282f65b8f88794c4` FE=API=worker

## Alembic
`135_candidate_career_pack_share` (no 136 — derived inventory only)

## Schema
`twin.candidate_access_inventory/v1` · `twin.candidate_access_revocation/v1` · NEW_ACCESS_GRANT_STORE=NONE

## Tests
- Unit: 3/3
- FE guard: ok
- Code/stance E2E A–M: 48/48
- Auth: product 14/14 + stance 7/7 + security 4/4 + invariant 4/4
- Regression 219+218: 15/15
- CI smoke: SUCCESS `31314496471`

## Canary invariant
before/after business-state diff = 0

## Always
REAL_CANDIDATE_USABILITY/VALUE=NOT_EVALUATED
Canary Run 1 = BLOCKED_EXTERNALLY_NOT_EXECUTED (not retried)
