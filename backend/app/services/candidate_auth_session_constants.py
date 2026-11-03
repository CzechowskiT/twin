"""Epic 2.22 — Candidate account session security constants.

Internal managed-session layer (TWIN is identity authority).
PARALLEL_IDENTITY_STORE=NONE · PARALLEL_CREDENTIAL_STORE=NONE.
"""

from __future__ import annotations

SESSION_SCHEMA_ID = "twin.candidate_auth_session/v1"
REFRESH_FAMILY_SCHEMA_ID = "twin.candidate_refresh_token_family/v1"
SECURITY_STATE_SCHEMA_ID = "twin.candidate_auth_security_state/v1"
CONTRACT_ID = "candidate_auth_session_v1"
FIRST_VALUE_CONTRACT = "pilot_first_value_v1"

PARALLEL_IDENTITY_STORE = "NONE"
PARALLEL_CREDENTIAL_STORE = "NONE"
CANONICAL_SESSION_AUTHORITY = "twin.candidate_auth_session"

NO_MASS_FORCED_LOGOUT = True
LEGACY_TOKEN_ACCEPTANCE = "BOUNDED_TO_ORIGINAL_EXPIRY"
FIRST_VALUE_SATISFIED_BY_AUTH_SESSION = False
BEHAVIORAL_SURVEILLANCE = False
FINGERPRINTING = False
SECURITY_SCORING = False
EIGHTH_PRIMARY_NAV = False

# Digests only — never store raw refresh tokens
REFRESH_DIGEST_ALG = "hmac-sha256"
ACCESS_TOKEN_TYP = "access"
MANAGED_CLAIM_SID = "sid"
MANAGED_CLAIM_EPOCH = "epoch"
MANAGED_CLAIM_TYP = "typ"

STATE_ACTIVE = "ACTIVE"
STATE_REVOKED = "REVOKED"
STATE_REUSE_SUSPECTED = "REUSE_SUSPECTED"
STATE_EXPIRED = "EXPIRED"

# Default refresh TTL (days) — longer than access; rotation on each use
DEFAULT_REFRESH_TTL_DAYS = 30
