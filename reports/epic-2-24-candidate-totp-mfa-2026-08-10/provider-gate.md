# Epic 2.24 — Strong-auth provider / dependency gate

## Decision

| Option | Verdict |
|--------|---------|
| Custom TOTP crypto | **REJECTED** — no home-grown RFC 6238 |
| Auth0 / Clerk / Cognito MFA plane | **REJECTED** — TWIN remains identity authority (Epic 2.22 gate) |
| WebAuthn / passkeys | **DEFERRED_NOT_STARTED** — no dependency, schema, UI, or placeholder |
| SMS / email OTP / push | **OUT OF SCOPE** |
| **pyotp** (RFC 6238) + **cryptography** Fernet AEAD | **SELECTED** — mature library; dedicated MFA keyring |

## Ownership boundaries

- Epic 2.22: managed sessions + refresh families (canonical)
- Epic 2.23: recovery + purpose-bound step-up
- Epic 2.24: TOTP factor / challenge / recovery codes / session assurance only

## Keyring

- Secrets encrypted with dedicated `MFA_AEAD_KEY` (Fernet) — **not** `SECRET_KEY` / JWT signing key
- Production: enrollment/verify **fail closed** if key unavailable
- No hardcoded production fallback

## Stance

- `MFA_DEFAULT=OFF`
- `MFA_ENROLLMENT=OPT_IN_ONLY`
- `MANDATORY_MFA=OFF`
- `PASSKEYS_WEBAUTHN=DEFERRED_NOT_STARTED`
- `first_value_satisfied_by_mfa=false`
