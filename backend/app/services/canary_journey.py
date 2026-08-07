"""Epic 2.14 — progressive disclosure + activation funnel instrumentation.

CORE_NOW / NEXT / LATER / ADVANCED — no 8th primary nav.
Friction events are content-free (no raw query / PII / keystrokes).
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidateCanaryFrictionEvent

SCHEMA = "twin.canary_journey_disclosure/v1"

DISCLOSURE = {
    "CORE_NOW": [
        {"id": "home", "href": "/dashboard"},
        {"id": "guided_fv", "href": "/dashboard"},
        {"id": "privacy", "href": "/dashboard/privacy-center"},
        {"id": "import_or_manual", "href": "/dashboard/import"},
    ],
    "NEXT": [
        {"id": "direction", "href": "/dashboard/career"},
        {"id": "evidence", "href": "/dashboard/portfolio"},
        {"id": "opportunities", "href": "/dashboard/matches"},
        {"id": "plan", "href": "/dashboard/execution-calendar"},
    ],
    "LATER": [
        {"id": "decisions", "href": "/dashboard/approvals"},
        {"id": "workspace_search", "href": "/dashboard/workspace-search"},
        {"id": "help", "href": "/dashboard/help"},
        {"id": "feedback", "href": "/dashboard/help/feedback"},
    ],
    "ADVANCED": [
        {"id": "strategy", "href": "/dashboard/strategy"},
        {"id": "interview", "href": "/dashboard/interview-decision"},
        {"id": "transition", "href": "/dashboard/career-transition"},
        {"id": "calendar_sync", "href": "/dashboard/calendar-sync"},
    ],
}

ALLOWED_FRICTION = frozenset(
    {
        "empty_state_seen",
        "cta_missed",
        "step_abandoned",
        "privacy_pause_hit",
        "import_preview_only",
        "search_no_results",
        "recovery_opened",
        "feedback_submitted",
        "session_resumed",
        "error_boundary",
    }
)

FUNNEL_STEPS = [
    "invite_ready",
    "account_created",
    "consent_privacy",
    "guided_onboarding",
    "import_or_manual",
    "career_compass",
    "first_evidence",
    "opportunity_or_search",
    "first_decision",
    "daily_os",
    "return_visit",
    "feedback",
    "canary_evidence",
    "founder_decision",
]


def disclosure_catalog() -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "primary_ia_count": 7,
        "eighth_nav_item": False,
        "tiers": DISCLOSURE,
        "funnel_steps": FUNNEL_STEPS,
        "claim_kind": "FACT",
    }


def record_friction(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    event_code: str,
    surface: str | None = None,
    lane: str = "SYNTHETIC",
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    code = (event_code or "").strip().lower()
    if code not in ALLOWED_FRICTION:
        raise ValueError("unknown_friction_event")
    # Strip any free-text / query-like keys
    cleaned: dict[str, Any] = {}
    for k, v in (payload or {}).items():
        if k not in {"count", "reason_code", "duration_ms", "step_id", "tier"}:
            continue
        if isinstance(v, str):
            cleaned[k] = v[:64]
        elif isinstance(v, (int, float, bool)):
            cleaned[k] = v
    lane_u = "REAL" if (lane or "").upper() == "REAL" else "SYNTHETIC"
    row = CandidateCanaryFrictionEvent(
        candidate_id=candidate_id,
        user_id=user_id,
        event_code=code,
        surface=(surface or "")[:64] or None,
        lane=lane_u,
        payload_json=json.dumps(cleaned, separators=(",", ":")),
        kpi_excluded=True,
        created_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    return {
        "ok": True,
        "event_code": code,
        "lane": lane_u,
        "kpi_excluded": True,
        "query_logged": False,
    }


def adoption_registry() -> dict[str, Any]:
    return {
        "schema": "twin.adoption_evidence_registry/v1",
        "lanes": ["REAL", "SYNTHETIC"],
        "real_metrics_default": "NOT_EVALUATED",
        "synthetic_never_flips_real": True,
        "success_criteria": [
            "first_value_actioned",
            "daily_os_return",
            "feedback_submitted",
            "no_founder_tech_intervention",
        ],
        "abort_criteria": [
            "privacy_block",
            "cannot_reach_first_value",
            "cross_candidate_leak",
            "invite_cap_breach",
            "search_query_leak",
        ],
        "claim_kind": "FACT",
    }
