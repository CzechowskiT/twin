# Epic 2.23 — Recovery owner audit (extend; do not fork)

## Existing surface (pre-2.23)

- Store: `password_reset_tokens` (Alembic 004) — SHA-256 digests, ~60m TTL
- API: `POST /auth/forgot-password` (generic ack), `POST /auth/reset-password`
- Gap: reset did **not** bump managed-session epoch / revoke refresh families

## Decision

- **Extend** `password_reset_tokens` (+ state/used_at/cancelled_at/kpi_excluded) — no parallel recovery store
- Atomic completion: `SELECT FOR UPDATE` → hash password → `revoke_everywhere` → invalidate other challenges → security receipt → commit
- **No auto-mint** session from recovery; require fresh login
- Hash-fragment links `/reset-password#token=` with FE `replaceState` strip; legacy `?token=` bounded by flag
- Step-up: purpose-bound challenges TTL≤5m; header `X-Twin-Step-Up`; purposes allowlisted only
- MFA/passkeys = `DEFERRED_PENDING_RECOVERY_PROOF`
- PARALLEL_IDENTITY/CREDENTIAL/MANAGED_SESSION/PASSWORD_RESET/RECOVERY_CHANNEL = NONE
- Synthetic/KPI-excluded → mail sink only; ops `mint-synthetic-recovery` for E2E

## Non-goals

- No second IdP, device trust, behavioral scoring, IP/UA fingerprinting, open tracking
- No Canary Run 1, no real recovery emails, no staff credential mutation
