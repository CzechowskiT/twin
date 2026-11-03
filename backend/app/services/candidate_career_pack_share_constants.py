"""Epic 2.19 — Career Pack private share grant constants.

TWIN never sends the link. No recipient PII. No access analytics.
PARALLEL_CAREER_PACK_STORE=NONE — grants only, no content copy.
"""

from __future__ import annotations

SCHEMA_ID = "twin.candidate_career_pack_share_grant/v1"
CONTRACT_ID = "candidate_career_pack_share_grant_v1"
FIRST_VALUE_CONTRACT = "pilot_first_value_v1"

PARALLEL_CAREER_PACK_STORE = "NONE"
OUTBOUND_SEND = False
RECIPIENT_TRACKING = False
ACCESS_ANALYTICS = False
EIGHTH_PRIMARY_NAV = False
FIRST_VALUE_SATISFIED_BY_SHARE_GRANT = False
PUBLIC_PROFILE = False
EMAIL_SEND = False

PERMISSIONS = ("INLINE_VIEW", "INLINE_VIEW_AND_DOWNLOAD")

GRANT_STATES = frozenset(
    {
        "ACTIVE",
        "EXPIRED",
        "REVOKED",
        "PACK_UNAVAILABLE",
        "DELETED",
    }
)

DEFAULT_TTL_HOURS = 24
MAX_TTL_HOURS = 72
MAX_ACTIVE_GRANTS_PER_CANDIDATE = 5
SECRET_BYTES = 32  # ≥256-bit
COOKIE_NAME = "twin_cps_sess"
COOKIE_MAX_AGE_SECONDS = 3600
EXCHANGE_RATE_LIMIT_PER_MINUTE = 20
