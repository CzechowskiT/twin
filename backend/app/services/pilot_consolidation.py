"""Epic 2.9 — Product consolidation / private pilot readiness (INACTIVE).

No new intelligence domain. Reuses Daily OS, funnel, invite tokens, health gates.
Invite send remains OFF; enrollment OFF; Launch NO-GO.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.services import candidate_invite_tokens as invites
from app.services import product_funnel as funnel

logger = logging.getLogger(__name__)

SCHEMA = "twin.pilot_consolidation/v1"
PILOT_ACCESS_STATUS = "PRODUCTION_READY_INACTIVE"
FIRST_VALUE_CONTRACT_ID = "pilot_first_value_v1"

# Allowlisted pilot-funnel events (extend product_funnel.FUNNEL_EVENTS)
PILOT_FUNNEL_EVENTS = frozenset(
    {
        "pilot_consent_oriented",
        "pilot_onboarding_skipped",
        "pilot_first_value_reached",
        "pilot_daily_os_opened",
        "pilot_home_opened",
        "pilot_privacy_opened",
    }
)


def pilot_access_snapshot(db: Session | None = None) -> dict[str, Any]:
    """Server-side invite/enrollment posture — never activates enrollment."""
    s = get_settings()
    metrics = {"invite_tokens_active": 0, "invite_tokens_used": 0, "kpi_excluded": True}
    if db is not None:
        try:
            metrics = invites.hardening_invite_metrics(db)
        except Exception:
            logger.debug("invite metrics skip", exc_info=True)
    return {
        "schema": SCHEMA,
        "pilot_access_status": PILOT_ACCESS_STATUS,
        "enrollment_enabled": bool(s.external_pilot_enrollment_enabled),
        "invite_only": bool(s.pilot_registration_invite_only),
        "invite_send_enabled": False,
        "real_invites_sent": 0,
        "real_pilot_users_added": 0,
        "launch": "NO-GO",
        "phase_3b": "BLOCKED",
        "phase_3_agent": "NOT_STARTED",
        "microsoft_calendar_write": False,
        "application_submission": False,
        "external_purchase_enrollment": False,
        "invite_metrics": metrics,
        "claim_kind": "FACT",
    }


def first_value_contract() -> dict[str, Any]:
    return {
        "id": FIRST_VALUE_CONTRACT_ID,
        "definition": (
            "After sign-in and optional short onboarding, candidate reaches Home/Today "
            "with Daily OS (or calm empty next-action) and can open one useful surface "
            "(direction, opportunities, or evidence) without Founder help."
        ),
        "not_sufficient": ["sign_in_alone", "dashboard_open_alone", "module_tour"],
        "routes": {
            "home": "/dashboard",
            "daily_os_api": "/api/v1/candidates/me/career-copilot/daily",
            "direction": "/dashboard/career",
            "opportunities": "/dashboard/matches",
            "evidence": "/dashboard/portfolio",
            "approvals": "/dashboard/approvals",
            "privacy": "/dashboard/privacy-center",
        },
        "claim_kind": "FACT",
    }


def primary_ia() -> dict[str, Any]:
    return {
        "primary": [
            {"id": "home", "href": "/dashboard"},
            {"id": "direction", "href": "/dashboard/career"},
            {"id": "opportunities", "href": "/dashboard/matches"},
            {"id": "evidence", "href": "/dashboard/portfolio"},
            {"id": "plan", "href": "/dashboard/execution-calendar"},
            {"id": "decisions", "href": "/dashboard/approvals"},
            {"id": "settings", "href": "/dashboard/privacy-center"},
        ],
        "progressive_disclosure": True,
        "jargon_in_primary": False,
        "claim_kind": "FACT",
    }


def emit_pilot_event(
    db: Session,
    *,
    event_name: str,
    user_id: int | None,
    kpi_excluded: bool = True,
    properties: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Privacy-safe telemetry — allowlisted names only; strips PII via funnel."""
    if event_name not in PILOT_FUNNEL_EVENTS and event_name not in funnel.FUNNEL_EVENTS:
        return {"ok": False, "reason": "event_not_allowlisted", "kpi_excluded": True}
    props = dict(properties or {})
    props["kpi_excluded"] = bool(kpi_excluded)
    props["pilot_consolidation"] = True
    # Strip anything that could carry content
    for banned in (
        "cv",
        "cv_text",
        "evidence",
        "jd",
        "transcript",
        "calendar_title",
        "notes",
        "email",
        "token",
        "name",
        "phone",
    ):
        props.pop(banned, None)
    row = funnel.emit_funnel_event(
        db,
        event_name=event_name,
        user_id=user_id,
        persona="candidate",
        properties=props,
        once=False,
        commit=True,
    )
    return {"ok": True, "event": event_name, "kpi_excluded": True, "stored": row is not None}


def build_aggregate(db: Session, *, user_id: int | None = None, candidate_id: int | None = None) -> dict[str, Any]:
    _ = candidate_id
    access = pilot_access_snapshot(db)
    return {
        "schema": SCHEMA,
        "ia": primary_ia(),
        "first_value": first_value_contract(),
        "pilot_access": access,
        "telemetry": {
            "allowlisted": sorted(PILOT_FUNNEL_EVENTS | set(funnel.FUNNEL_EVENTS)),
            "session_replay": False,
            "third_party_ads": False,
            "cv_content": False,
            "protected_attrs": False,
            "kpi_excluded_default": True,
        },
        "safety": {
            "enrollment_enabled": False,
            "invite_send_enabled": False,
            "launch_nogo": True,
            "phase_3b_blocked": True,
            "phase_3_agent": "NOT_STARTED",
            "microsoft_calendar_write": False,
            "application_submission": False,
            "external_purchase_enrollment": False,
            "new_intelligence_module": False,
            "productivity_score": False,
            "motivation_score": False,
        },
        "routes": first_value_contract()["routes"],
        "kpi_excluded": True,
        "user_scoped": user_id is not None,
    }
