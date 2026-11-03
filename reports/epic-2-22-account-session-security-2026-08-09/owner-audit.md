# Epic 2.22 — Auth / Provider Reuse Gate

## Verdict
**BUILD_INTERNAL_MANAGED_SESSION_LAYER** (not REUSE_EXTERNAL_IDP_SESSIONS)

## Evidence
- Candidate app sessions are TWIN-minted HS256 JWTs (`create_access_token` / managed claims)
- No Auth0/Clerk/Cognito/Supabase session inventory wired for product login
- Federated Google/GitHub/Apple/Microsoft/LinkedIn = login federation only
- Epic 2.20 AUTH_SESSION was meta-only (`revocable=False`, `PARALLEL_AUTH_SESSION_STORE=NONE`)

## Canonical authority
`twin.candidate_auth_session` — exactly one CANONICAL_SESSION_AUTHORITY  
PARALLEL_IDENTITY_STORE=NONE · PARALLEL_CREDENTIAL_STORE=NONE

## Migration stance
LEGACY_TOKEN_ACCEPTANCE=BOUNDED_TO_ORIGINAL_EXPIRY · NO_MASS_FORCED_LOGOUT  
Flags: AUTH_MANAGED_SESSION_MINT/VERIFY/ENFORCE, AUTH_REFRESH_ROTATION, AUTH_REFRESH_REUSE_DETECTION, AUTH_LEGACY_TOKEN_ACCEPTANCE

## Recovery
Link to existing `/forgot-password` / IdP only — no new MFA/credential DB
