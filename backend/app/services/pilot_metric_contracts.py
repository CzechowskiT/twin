"""Epic 2.10 — pilot metric-contract registry (READY_TO_MEASURE).

Exact denominators only. No vanity, open-rate, inferred delivery, satisfaction,
retention, or employment-success claims.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, CandidatePilotFeedback, CandidateSupportCase, ProductFunnelEvent

SCHEMA = "twin.pilot_metric_contracts/v1"
READY = "READY_TO_MEASURE"


def metric_contracts() -> list[dict[str, Any]]:
    return [
        {
            "id": "invites_generated",
            "status": READY,
            "numerator": "real_invites_generated",
            "denominator": "approved_roster_slots",
            "forbidden": ["open_rate", "inferred_delivery"],
        },
        {
            "id": "invites_sent",
            "status": READY,
            "numerator": "real_invites_provider_accepted",
            "denominator": "real_invites_generated",
            "forbidden": ["open_rate"],
        },
        {
            "id": "invites_redeemed",
            "status": READY,
            "numerator": "real_invites_redeemed",
            "denominator": "real_invites_sent",
        },
        {
            "id": "enrolled",
            "status": READY,
            "numerator": "real_candidates_enrolled",
            "denominator": "real_invites_redeemed",
        },
        {
            "id": "first_value",
            "status": READY,
            "numerator": "first_value_reached",
            "denominator": "real_candidates_enrolled",
            "definition": "server_side_first_value_v1",
            "not_sufficient": ["page_view", "sign_in"],
        },
        {
            "id": "support_cases_opened",
            "status": READY,
            "numerator": "support_cases_submitted",
            "denominator": "real_candidates_enrolled",
        },
        {
            "id": "feedback_submitted",
            "status": READY,
            "numerator": "pilot_feedback_submitted",
            "denominator": "real_candidates_enrolled",
            "forbidden": ["training_use", "ranking_use"],
        },
    ]


def derive_first_value(
    db: Session,
    *,
    user_id: int,
    candidate_id: int | None,
) -> dict[str, Any]:
    """Server-side first-value — not page view / sign-in alone."""
    _ = candidate_id
    events = set()
    try:
        rows = (
            db.query(ProductFunnelEvent.event_name)
            .filter(ProductFunnelEvent.user_id == user_id)
            .all()
        )
        events = {r[0] for r in rows}
    except Exception:
        events = set()
    has_daily = "pilot_daily_os_opened" in events or "daily_os_opened" in events
    has_useful = bool(
        events
        & {
            "pilot_home_opened",
            "pilot_first_value_reached",
            "matches_viewed",
            "portfolio_opened",
            "career_opened",
        }
    )
    # Sign-in alone is never enough
    reached = bool(has_daily and has_useful)
    return {
        "schema": "twin.first_value_derivation/v1",
        "reached": reached,
        "signals": {
            "daily_os_or_home_context": has_daily,
            "useful_surface": has_useful,
            "sign_in_alone_insufficient": True,
            "page_view_alone_insufficient": True,
        },
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def aggregate_counts(db: Session) -> dict[str, Any]:
    """Aggregate ops counts — no PII/content."""
    support_open = (
        db.query(CandidateSupportCase)
        .filter(
            CandidateSupportCase.deleted_at.is_(None),
            CandidateSupportCase.status.in_(
                ("SUBMITTED", "TRIAGED", "IN_PROGRESS", "WAITING_CANDIDATE")
            ),
        )
        .count()
    )
    feedback_n = (
        db.query(CandidatePilotFeedback)
        .filter(
            CandidatePilotFeedback.deleted_at.is_(None),
            CandidatePilotFeedback.status == "SUBMITTED",
        )
        .count()
    )
    real_users = db.query(Candidate).count()
    # Real pilot users added remains 0 by product gate; do not invent.
    return {
        "support_cases_open": int(support_open),
        "feedback_submitted": int(feedback_n),
        "real_invites_generated": 0,
        "real_invites_sent": 0,
        "real_invites_redeemed": 0,
        "real_candidates_enrolled": 0,
        "first_value_reached": 0,
        "candidates_in_db_not_pilot_kpi": int(real_users),
        "kpi_excluded": True,
    }


def registry_payload(db: Session | None = None) -> dict[str, Any]:
    counts = (
        aggregate_counts(db)
        if db is not None
        else {
            "real_invites_generated": 0,
            "real_invites_sent": 0,
            "real_invites_redeemed": 0,
            "real_candidates_enrolled": 0,
            "first_value_reached": 0,
            "kpi_excluded": True,
        }
    )
    return {
        "schema": SCHEMA,
        "status": READY,
        "contracts": metric_contracts(),
        "counts": counts,
        "vanity_metrics": False,
        "open_rate": False,
        "inferred_delivery": False,
        "satisfaction_score": False,
        "retention_claim": False,
        "employment_success_claim": False,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }
