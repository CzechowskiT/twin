"""Epic 2.11 — Capability discoverability + actionable empty states + public preview.

Extends the 7-area IA registry. No 8th nav item. No silent personalization scores.
"""

from __future__ import annotations

from typing import Any

SCHEMA = "twin.mechanical_discoverability/v1"
EMPTY_SCHEMA = "twin.actionable_empty_state/v1"
PREVIEW_STATUS = "READY_INACTIVE"  # code ready; not enabled in production

PRIMARY_IA = [
    {"id": "home", "href": "/dashboard", "empty_key": "home"},
    {"id": "direction", "href": "/dashboard/career", "empty_key": "direction"},
    {"id": "opportunities", "href": "/dashboard/matches", "empty_key": "opportunities"},
    {"id": "evidence", "href": "/dashboard/portfolio", "empty_key": "evidence"},
    {"id": "plan", "href": "/dashboard/execution-calendar", "empty_key": "plan"},
    {"id": "decisions", "href": "/dashboard/approvals", "empty_key": "decisions"},
    {"id": "settings", "href": "/dashboard/privacy-center", "empty_key": "settings"},
]

JOURNEY_GROUPS = [
    {
        "id": "get_oriented",
        "areas": ["home", "direction"],
        "entry": "guided_first_value",
    },
    {
        "id": "build_signal",
        "areas": ["evidence", "opportunities"],
        "entry": "starter_paths",
    },
    {
        "id": "act_and_decide",
        "areas": ["plan", "decisions"],
        "entry": "daily_os",
    },
    {
        "id": "control_and_help",
        "areas": ["settings"],
        "secondary": ["/dashboard/help", "/dashboard/help/feedback"],
        "entry": "privacy_help",
    },
]

# Disposition: actionable | positive_empty | loading_not_empty | error_not_empty
EMPTY_STATE_REGISTRY: dict[str, dict[str, Any]] = {
    "home": {
        "disposition": "actionable",
        "primary_cta": "guided_first_value_or_direction",
        "href": "/dashboard",
        "positive_empty_ok": True,
    },
    "direction": {
        "disposition": "actionable",
        "primary_cta": "set_direction_without_cv",
        "href": "/dashboard/career",
        "positive_empty_ok": True,
    },
    "opportunities": {
        "disposition": "actionable",
        "primary_cta": "review_or_demo",
        "href": "/dashboard/matches",
        "positive_empty_ok": True,
    },
    "evidence": {
        "disposition": "actionable",
        "primary_cta": "add_first_evidence",
        "href": "/dashboard/portfolio",
        "positive_empty_ok": True,
    },
    "plan": {
        "disposition": "actionable",
        "primary_cta": "organize_actions",
        "href": "/dashboard/execution-calendar",
        "positive_empty_ok": True,
    },
    "decisions": {
        "disposition": "positive_empty",
        "primary_cta": "open_home",
        "href": "/dashboard/approvals",
        "positive_empty_ok": True,
    },
    "settings": {
        "disposition": "actionable",
        "primary_cta": "privacy_controls",
        "href": "/dashboard/privacy-center",
        "positive_empty_ok": True,
    },
    "help": {
        "disposition": "actionable",
        "primary_cta": "open_help",
        "href": "/dashboard/help",
        "positive_empty_ok": True,
    },
}

TOUR_STEPS = [
    {"area_id": "home", "href": "/dashboard"},
    {"area_id": "direction", "href": "/dashboard/career"},
    {"area_id": "opportunities", "href": "/dashboard/matches"},
    {"area_id": "evidence", "href": "/dashboard/portfolio"},
    {"area_id": "plan", "href": "/dashboard/execution-calendar"},
    {"area_id": "decisions", "href": "/dashboard/approvals"},
    {"area_id": "settings", "href": "/dashboard/privacy-center"},
]


def discoverability_registry() -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "contract_id": "mechanical_discoverability_v1",
        "primary_count": len(PRIMARY_IA),
        "primary": PRIMARY_IA,
        "eighth_nav_item": False,
        "silent_personalization_scores": False,
        "journey_groups": JOURNEY_GROUPS,
        "tour": {
            "steps": TOUR_STEPS,
            "skippable": True,
            "accessible": True,
            "equals_first_value": False,
        },
        "public_preview": {
            "status": PREVIEW_STATUS,
            "enabled_in_production": False,
            "code_ready": True,
        },
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def empty_state_contract() -> dict[str, Any]:
    applicable = list(EMPTY_STATE_REGISTRY.keys())
    return {
        "schema": EMPTY_SCHEMA,
        "contract_id": "actionable_empty_state_v1",
        "applicable_routes": applicable,
        "complete_count": len(applicable),
        "expected_count": len(applicable),
        "loading_equals_empty": False,
        "error_equals_empty": False,
        "positive_empty_ok": True,
        "registry": EMPTY_STATE_REGISTRY,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def public_preview_status() -> dict[str, Any]:
    return {
        "status": PREVIEW_STATUS,
        "enabled_in_production": False,
        "code_ready": True,
        "claim_kind": "FACT",
    }
