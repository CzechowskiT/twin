"""Epic 2.21 — Workspace cohesion handoff constants.

Short-lived encrypted envelopes only. No parallel handoff/checkpoint store.
Continuity (2.18) remains sole Continue owner.
"""

from __future__ import annotations

REGISTRY_SCHEMA_ID = "twin.candidate_handoff_registry/v1"
CONTEXT_SCHEMA_ID = "twin.candidate_handoff_context/v1"
CONTRACT_ID = "candidate_workspace_handoff_v1"
FIRST_VALUE_CONTRACT = "pilot_first_value_v1"

PARALLEL_HANDOFF_OR_CHECKPOINT_STORE = "NONE"
PARALLEL_ACTIVITY_TIMELINE = "NONE"
PARALLEL_JOURNEY_GRAPH = "NONE"

EIGHTH_PRIMARY_NAV = False
FIRST_VALUE_SATISFIED_BY_HANDOFF = False
BEHAVIORAL_SURVEILLANCE = False
NEXT_BEST_ACTION = False
URGENCY_SCORES = False
MUTATIONS_AT_HANDOFF_LAYER = False

DEFAULT_TTL_SECONDS = 30 * 60  # 30m
MAX_TTL_SECONDS = 30 * 60
MAX_DEPTH = 3

# Allowlisted route keys (no arbitrary URLs)
ROUTE_KEYS = {
    "import_center": "/dashboard/import",
    "data_trust": "/dashboard/data-trust",
    "path_home": "/dashboard",
    "matches": "/dashboard/matches",
    "application_studio": "/dashboard/application-studio",
    "career_pack": "/dashboard/career-pack",
    "access_center": "/dashboard/settings/access",
    "privacy_center": "/dashboard/privacy-center",
}

# handoff_id → definition (minimal refs only)
HANDOFF_REGISTRY: dict[str, dict] = {
    "import_to_data_trust": {
        "source_route_key": "import_center",
        "dest_route_key": "data_trust",
        "return_route_key": "import_center",
        "object_kind": "import_batch",
        "journey": "A",
        "prefer_continuity_flow": "CANDIDATE_IMPORT_REVIEW",
        "label": "Review import in Data Trust",
    },
    "data_trust_to_path_home": {
        "source_route_key": "data_trust",
        "dest_route_key": "path_home",
        "return_route_key": "data_trust",
        "object_kind": "data_trust_review",
        "journey": "A",
        "prefer_continuity_flow": "DATA_TRUST_REVIEW",
        "label": "Continue to Path readiness",
    },
    "opportunity_to_app_studio": {
        "source_route_key": "matches",
        "dest_route_key": "application_studio",
        "return_route_key": "matches",
        "object_kind": "opportunity",
        "journey": "B",
        "prefer_continuity_flow": "APPLICATION_STUDIO_DRAFT",
        "label": "Open Application Studio with opportunity context",
    },
    "app_studio_to_career_pack": {
        "source_route_key": "application_studio",
        "dest_route_key": "career_pack",
        "return_route_key": "application_studio",
        "object_kind": "app_studio_workspace",
        "journey": "B",
        "prefer_continuity_flow": "CAREER_PACK_DRAFT",
        "label": "Build Career Pack from Application Studio",
    },
    "career_pack_to_access_center": {
        "source_route_key": "career_pack",
        "dest_route_key": "access_center",
        "return_route_key": "career_pack",
        "object_kind": "career_pack",
        "journey": "B",
        "prefer_continuity_flow": None,
        "label": "Manage access after private share",
    },
}
