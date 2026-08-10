# Epic 2.24 — Candidate-Controlled TOTP MFA + Recovery Codes

**Verdict A** @ product `2e94b290` FE=API=worker ALIGNED.

- pyotp RFC 6238; dedicated `MFA_AEAD_KEY`; Alembic `138`
- MFA_DEFAULT=OFF; OPT_IN_ONLY; passkeys DEFERRED_NOT_STARTED
- Evidence: this directory; CI `31358448839`; canary diff 0
- Stop: no Epic 2.25 auto; no Canary Run 1 retry
