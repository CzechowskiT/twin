# Rollback compatibility (Epic 2.25 RC)

## Floor
Minimum compatible rollback target must understand:
- managed candidate sessions (Epic 2.22)
- account recovery + step-up (Epic 2.23)
- opt-in TOTP MFA + recovery codes + session assurance (Epic 2.24)
- Alembic head `138_candidate_totp_mfa`

## Forbidden
Destructive production downgrade to pre-2.24 code that could ignore an enabled MFA factor or managed-session revocation semantics.

## Non-destructive proof
- Production DB remains at `138_candidate_totp_mfa` (`is_at_head=true` after RC fix).
- RC product SHA `c84f0373` only corrected expected-head metadata + certification harness; no schema change.
- Canary control plane unchanged (diff_count=0).
