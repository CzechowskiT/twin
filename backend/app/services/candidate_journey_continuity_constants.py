"""Epic 2.18 — Candidate Journey Continuity / Safe Resume constants.

Reuses candidate_path_readiness_sessions as sole backing store.
PARALLEL_CHECKPOINT_STORE = NONE. Continuity ≠ first value.
"""

from __future__ import annotations

SCHEMA_ID = "twin.candidate_journey_session/v1"
ADAPTER_CONTRACT = "candidate_journey_flow_adapter/v1"
SAFE_RESUME_CONTRACT = "candidate_safe_resume/v1"
FIRST_VALUE_CONTRACT = "pilot_first_value_v1"

PARALLEL_CHECKPOINT_STORE = "NONE"
EIGHTH_PRIMARY_NAV = False
FIRST_VALUE_SATISFIED_BY_CONTINUITY = False
EMAIL_PUSH_REMINDERS = False
BEHAVIORAL_SURVEILLANCE = False
URGENCY_INBOX = False
MUTATES_ON_RESUME = False
DEFAULT_TTL_HOURS = 168  # 7 days
MAX_CONTINUE_ITEMS = 8

FLOW_KINDS = (
    "CANDIDATE_PATH_READINESS",
    "CANDIDATE_IMPORT_REVIEW",
    "DATA_TRUST_REVIEW",
    "CAREER_PACK_DRAFT",
    "APPLICATION_STUDIO_DRAFT",
    "LIFECYCLE_APPROVAL_REVIEW",
)

# Continuity status (orthogonal to path readiness ACTIVE/CLEARED/SUPERSEDED)
CONTINUITY_STATUSES = frozenset(
    {
        "ACTIVE",
        "PAUSED",
        "PINNED",
        "SUPERSEDED",
        "CLEARED",
        "INVALIDATED",
        "EXPIRED",
        "COMPLETED",
    }
)

# Allowlisted route keys → href (no arbitrary URLs)
ROUTE_KEYS = {
    "path_readiness_home": "/dashboard",
    "import_center": "/dashboard/import",
    "data_trust": "/dashboard/data-trust",
    "career_pack": "/dashboard/career-pack",
    "application_studio": "/dashboard/application-studio",
    "interview_decision": "/dashboard/interview-decision",
    "interview_practice": "/dashboard/interview-practice",
    "approvals": "/dashboard/approvals",
    "privacy_center": "/dashboard/privacy-center",
}

FLOW_DEFAULT_ROUTE = {
    "CANDIDATE_PATH_READINESS": "path_readiness_home",
    "CANDIDATE_IMPORT_REVIEW": "import_center",
    "DATA_TRUST_REVIEW": "data_trust",
    "CAREER_PACK_DRAFT": "career_pack",
    "APPLICATION_STUDIO_DRAFT": "application_studio",
    "LIFECYCLE_APPROVAL_REVIEW": "approvals",
}

# Adapter capability matrix keys (8 columns × 6 flows)
ADAPTER_CAPABILITIES = (
    "checkpoint",
    "resume",
    "revision_check",
    "pin",
    "pause",
    "clear",
    "invalidate_on_complete",
    "non_mutating_route",
)
