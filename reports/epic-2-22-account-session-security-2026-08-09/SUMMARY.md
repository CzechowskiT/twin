# Epic 2.22 — Candidate Account Session Security and Recovery Control (2026-08-09)

## Verdict A
CANDIDATE ACCOUNT SESSION SECURITY AND RECOVERY CONTROL CUSTOMER-USABLE — VALID-SESSION-PRESERVING MANAGED-JWT MIGRATION, ONE-TIME REFRESH ROTATION, TOKEN-FAMILY REUSE CONTAINMENT AND OWNER-CONTROLLED ACCESS CENTER REVOCATION PRODUCTION-READY; NO FINGERPRINTING, SECURITY SCORING OR MASS FORCED LOGOUT

## Product SHA (ALIGNED)
`25aa9dd7f53b6a76ddb7f974c72a4b69a6030b1a` FE=API=worker

## Alembic
`136_candidate_auth_session` (revises 135)

## Schemas
`twin.candidate_auth_session/v1` · `twin.candidate_refresh_token_family/v1` · `twin.candidate_auth_security_state/v1` · PARALLEL_IDENTITY/CREDENTIAL=NONE

## Tests
- Unit: 5/5
- FE guard: ok
- Code/stance E2E A–M: 34/34
- Auth: product 15/15 + stance 7/7 + security 4/4 + invariant 4/4
- CI smoke: SUCCESS `31317499574`

## Canary invariant
before/after business-state diff = 0

## Always
REAL_* / absolute security = NOT_EVALUATED
Canary Run 1 = BLOCKED_EXTERNALLY_NOT_EXECUTED (not retried)
