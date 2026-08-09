"""Epic 2.17 — Candidate Career Pack constants.

Owner-only private packs. TWIN never sends/publishes/externally delivers.
No LLM rewrite/summarize/tailor. Pack ops ≠ first value.
"""

from __future__ import annotations

SCHEMA_ID = "twin.candidate_career_pack/v1"
CONTRACT_ID = "candidate_career_pack_v1"
FIRST_VALUE_CONTRACT = "pilot_first_value_v1"

PACK_TYPES = (
    "OPPORTUNITY_APPLICATION_PACK",
    "GENERAL_EVIDENCE_PORTFOLIO_PACK",
)

PACK_STATES = frozenset(
    {
        "DRAFT",
        "PREVIEW_READY",
        "AWAITING_CONFIRMATION",
        "GENERATING",
        "READY",
        "EXPIRED",
        "REVOKED",
        "DELETED",
    }
)

# Field-level disclosure allowlist (sensitive default OFF)
DISCLOSURE_FIELDS = {
    "display_name": {"sensitive": False, "default_on": True, "internal_only": False},
    "headline": {"sensitive": False, "default_on": True, "internal_only": False},
    "skills": {"sensitive": False, "default_on": True, "internal_only": False},
    "evidence_titles": {"sensitive": False, "default_on": True, "internal_only": False},
    "evidence_summaries": {"sensitive": False, "default_on": False, "internal_only": False},
    "application_workspace_title": {"sensitive": False, "default_on": True, "internal_only": False},
    "approved_cv_excerpt": {"sensitive": False, "default_on": False, "internal_only": False},
    "approved_cover_excerpt": {"sensitive": False, "default_on": False, "internal_only": False},
    "contact_email": {"sensitive": True, "default_on": False, "internal_only": False},
    "phone": {"sensitive": True, "default_on": False, "internal_only": False},
    "location": {"sensitive": True, "default_on": False, "internal_only": False},
    "salary_expectations": {"sensitive": True, "default_on": False, "internal_only": False},
    "internal_notes": {"sensitive": True, "default_on": False, "internal_only": True},
    "twin_scores": {"sensitive": True, "default_on": False, "internal_only": True},
    "raw_cv_full": {"sensitive": True, "default_on": False, "internal_only": True},
}

ARTIFACT_KINDS = frozenset(
    {
        "career_evidence",
        "app_studio_workspace",
        "app_studio_cv_draft",
        "app_studio_cover_draft",
    }
)

EXTERNAL_DELIVERY = False
PUBLIC_PROFILE = False
CLOUD_UPLOAD = False
EMAIL_SEND = False
LLM_REWRITE = False
EIGHTH_PRIMARY_NAV = False
FIRST_VALUE_SATISFIED_BY_CAREER_PACK = False
DEFAULT_TTL_HOURS = 72
MAX_ARTIFACTS = 40
