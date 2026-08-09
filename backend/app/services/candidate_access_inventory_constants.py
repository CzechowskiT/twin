"""Epic 2.20 — Access & Sharing Control Center constants.

Derived inventory only. No new aggregate grant/token/session store.
"""

from __future__ import annotations

SCHEMA_ID = "twin.candidate_access_inventory/v1"
REVOCATION_SCHEMA_ID = "twin.candidate_access_revocation/v1"
CONTRACT_ID = "candidate_access_inventory_v1"
FIRST_VALUE_CONTRACT = "pilot_first_value_v1"

NEW_ACCESS_GRANT_STORE = "NONE"
PARALLEL_TOKEN_STORE = "NONE"
# Epic 2.22 — canonical authority is twin.candidate_auth_session (not a parallel store)
PARALLEL_AUTH_SESSION_STORE = "NONE"
CANONICAL_SESSION_AUTHORITY = "twin.candidate_auth_session"
PARALLEL_CONSENT_STORE = "NONE"
PARALLEL_SHARE_STORE = "NONE"
PARALLEL_AUDIT_TIMELINE_STORE = "NONE"

OUTBOUND_SEND = False
RECIPIENT_TRACKING = False
ACCESS_ANALYTICS = False
EIGHTH_PRIMARY_NAV = False
FIRST_VALUE_SATISFIED_BY_ACCESS_CENTER = False

ACCESS_KINDS = (
    "AUTH_SESSION",
    "OAUTH_CONNECTION",
    "CALENDAR_READ_CONSENT",
    "PRIVATE_CALENDAR_FEED",
    "CAREER_PACK_SHARE",
    "TEMPORARY_CAREER_PACK_ARTIFACT",
    "TEMPORARY_PRIVACY_EXPORT",
    "OTHER_EXPLICITLY_ALLOWLISTED",
)

# Explicitly excluded product state (not access grants)
EXCLUDED_DOMAINS = (
    "journey_continuity",
    "path_readiness",
    "data_trust",
    "daily_os",
    "drafts",
    "demo_preview",
    "page_views",
    "search_history",
)

UX_GROUPS = (
    "connected_services",
    "private_links_and_feeds",
    "temporary_files",
)

KIND_TO_GROUP = {
    "AUTH_SESSION": "connected_services",
    "OAUTH_CONNECTION": "connected_services",
    "CALENDAR_READ_CONSENT": "connected_services",
    "PRIVATE_CALENDAR_FEED": "private_links_and_feeds",
    "CAREER_PACK_SHARE": "private_links_and_feeds",
    "TEMPORARY_CAREER_PACK_ARTIFACT": "temporary_files",
    "TEMPORARY_PRIVACY_EXPORT": "temporary_files",
    "OTHER_EXPLICITLY_ALLOWLISTED": "connected_services",
}
