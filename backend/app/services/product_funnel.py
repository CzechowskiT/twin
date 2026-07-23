"""Server-side product funnel events + north-star aggregates (non-PII).

Canonical taxonomy lives in FUNNEL_EVENTS. Client dual-write is optional;
this module is the source of truth when PRODUCT_FUNNEL_EVENTS_ENABLED=true.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import (
    Application,
    JobMatch,
    ProductFunnelEvent,
    ScheduledInterview,
    User,
    UserGoogleCalendar,
)

logger = logging.getLogger(__name__)

# Stable event names — do not rename without a migration note in PRODUCT_METRICS.md
FUNNEL_EVENTS = frozenset(
    {
        "signup_completed",
        "onboarding_completed",
        "first_match",
        "application_created",
        "first_application",
        "calendar_connected",
        "interview_scheduled",
        "placement_declared",
        "placement_verified",
        "activation_ttv_matches_view",
        "activation_matching_eligible",
        "activation_matching_not_eligible",
        "activation_matching_dispatched",
        "activation_matching_started",
        "activation_matching_completed",
        "activation_matching_failed",
        "activation_first_match_created",
        # First-customer activation (non-PII)
        "feedback_submitted",
        "recruiter_inbox_opened",
        "company_home_opened",
        "support_ticket_opened",
        "pilot_invite_pack_prepared",
    }
)

ONCE_PER_USER = frozenset(
    {
        "signup_completed",
        "onboarding_completed",
        "first_match",
        "first_application",
        "calendar_connected",
        "activation_ttv_matches_view",
        "activation_matching_eligible",
        "activation_matching_not_eligible",
        "activation_first_match_created",
    }
)

# North Star: weekly count of users who reach acceptance-ready moments
NORTH_STAR_EVENTS = frozenset({"interview_scheduled", "placement_verified"})


def _signup_week(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    # ISO week key: YYYY-Www
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def _safe_props(props: dict[str, Any] | None) -> str | None:
    if not props:
        return None
    # Strip obvious PII keys if a caller slips
    banned = {"email", "password", "token", "name", "phone", "cv_text", "refresh_token"}
    clean = {k: v for k, v in props.items() if k.lower() not in banned and v is not None}
    if not clean:
        return None
    return json.dumps(clean, separators=(",", ":"), default=str)[:4000]


def funnel_enabled() -> bool:
    return bool(get_settings().product_funnel_events_enabled)


def emit_funnel_event(
    db: Session,
    *,
    event_name: str,
    user_id: int | None = None,
    persona: str = "candidate",
    properties: dict[str, Any] | None = None,
    once: bool | None = None,
    commit: bool = False,
) -> ProductFunnelEvent | None:
    """Append a funnel event. Never raises to callers — telemetry must not break product paths."""
    if not funnel_enabled():
        return None
    if event_name not in FUNNEL_EVENTS:
        logger.warning("unknown_funnel_event", extra={"event_name": event_name})
        return None
    try:
        once_flag = ONCE_PER_USER.__contains__(event_name) if once is None else once
        if once_flag and user_id is not None:
            exists = (
                db.query(ProductFunnelEvent.id)
                .filter(
                    ProductFunnelEvent.user_id == user_id,
                    ProductFunnelEvent.event_name == event_name,
                )
                .first()
            )
            if exists:
                return None

        signup_week = None
        if user_id is not None:
            created = db.query(User.created_at).filter(User.id == user_id).scalar()
            signup_week = _signup_week(created)

        row = ProductFunnelEvent(
            user_id=user_id,
            persona=(persona or "candidate")[:32],
            event_name=event_name,
            signup_week=signup_week,
            properties_json=_safe_props(properties),
            occurred_at=datetime.utcnow(),
        )
        db.add(row)
        if commit:
            db.commit()
            db.refresh(row)
        else:
            db.flush()
        return row
    except Exception:
        logger.exception("funnel_emit_failed", extra={"event_name": event_name, "user_id": user_id})
        return None


def emit_first_match_if_needed(db: Session, *, user_id: int, candidate_id: int) -> None:
    """Emit first_match once when the candidate has at least one JobMatch."""
    count = db.query(func.count(JobMatch.id)).filter(JobMatch.candidate_id == candidate_id).scalar() or 0
    if count < 1:
        return
    emit_funnel_event(
        db,
        event_name="first_match",
        user_id=user_id,
        properties={"match_count": int(count)},
    )


def _metrics_excluded_user_ids(db: Session) -> set[int]:
    rows = (
        db.query(User.id)
        .filter(User.exclude_from_product_metrics.is_(True))
        .all()
    )
    return {int(r[0]) for r in rows}


def build_funnel_snapshot(
    db: Session,
    *,
    days: int = 30,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    persona: str | None = None,
    include_test_accounts: bool = False,
    cohort: str | None = None,
    environment: str | None = None,
) -> dict[str, Any]:
    """Funnel counts for the admin dashboard (last N days + all-time unique users)."""
    now = datetime.utcnow()
    since = date_from or (now - timedelta(days=max(1, min(days, 365))))
    until = date_to or now
    excluded = set() if include_test_accounts else _metrics_excluded_user_ids(db)
    window_counts: dict[str, int] = {}
    unique_users: dict[str, int] = {}
    for name in sorted(FUNNEL_EVENTS):
        wq = db.query(func.count(ProductFunnelEvent.id)).filter(
            ProductFunnelEvent.event_name == name,
            ProductFunnelEvent.occurred_at >= since,
            ProductFunnelEvent.occurred_at <= until,
        )
        uq = db.query(func.count(func.distinct(ProductFunnelEvent.user_id))).filter(
            ProductFunnelEvent.event_name == name,
            ProductFunnelEvent.user_id.isnot(None),
        )
        if persona:
            wq = wq.filter(ProductFunnelEvent.persona == persona)
            uq = uq.filter(ProductFunnelEvent.persona == persona)
        if cohort:
            wq = wq.filter(ProductFunnelEvent.signup_week == cohort)
            uq = uq.filter(ProductFunnelEvent.signup_week == cohort)
        if excluded:
            wq = wq.filter(
                (ProductFunnelEvent.user_id.is_(None))
                | (~ProductFunnelEvent.user_id.in_(tuple(excluded)))
            )
            uq = uq.filter(~ProductFunnelEvent.user_id.in_(tuple(excluded)))
        window_counts[name] = int(wq.scalar() or 0)
        unique_users[name] = int(uq.scalar() or 0)

    users_q = db.query(func.count(User.id))
    if not include_test_accounts:
        users_q = users_q.filter(User.exclude_from_product_metrics.is_(False))
    signups = unique_users.get("signup_completed", 0) or (users_q.scalar() or 0)
    onboarded = unique_users.get("onboarding_completed", 0)
    first_match = unique_users.get("first_match", 0)
    first_app = unique_users.get("first_application", 0)
    calendar = unique_users.get("calendar_connected", 0)
    interviews = unique_users.get("interview_scheduled", 0)

    def rate(num: int, den: int) -> float:
        return round(100.0 * num / den, 1) if den else 0.0

    ns_q = db.query(func.count(func.distinct(ProductFunnelEvent.user_id))).filter(
        ProductFunnelEvent.event_name.in_(tuple(NORTH_STAR_EVENTS)),
        ProductFunnelEvent.occurred_at >= now - timedelta(days=7),
        ProductFunnelEvent.user_id.isnot(None),
    )
    if excluded:
        ns_q = ns_q.filter(~ProductFunnelEvent.user_id.in_(tuple(excluded)))
    north_star_7d = int(ns_q.scalar() or 0)

    activation = None
    if get_settings().activation_ttv_metrics_enabled:
        from app.services.activation_ttv_metrics import build_activation_funnel_extension

        activation = build_activation_funnel_extension(
            db,
            days=days,
            date_from=since,
            date_to=until,
            persona=persona or "candidate",
            include_test_accounts=include_test_accounts,
            cohort=cohort,
            environment=environment,
        )

    return {
        "north_star": {
            "name": "weekly_acceptance_ready_users",
            "definition": (
                "Distinct users with interview_scheduled or placement_verified in the last 7 days "
                "(excludes exclude_from_product_metrics unless include_test_accounts=true)"
            ),
            "value_7d": north_star_7d,
            "target_range": "pilot 5–25 / week; growth 200+ / week",
            "test_accounts_excluded": not include_test_accounts,
        },
        "window_days": days,
        "date_from": since.isoformat() + "Z",
        "date_to": until.isoformat() + "Z",
        "filters": {
            "persona": persona,
            "cohort": cohort,
            "include_test_accounts": include_test_accounts,
            "environment": environment,
        },
        "event_counts_window": window_counts,
        "unique_users_all_time": unique_users,
        "conversion": {
            "signup_to_onboarding_pct": rate(onboarded, signups),
            "onboarding_to_first_match_pct": rate(first_match, onboarded or signups),
            "first_match_to_first_application_pct": rate(first_app, first_match or onboarded),
            "onboarding_to_calendar_pct": rate(calendar, onboarded or signups),
            "onboarding_to_interview_pct": rate(interviews, onboarded or signups),
        },
        "proxy_truth": {
            "users_total": int(db.query(func.count(User.id)).scalar() or 0),
            "onboarding_completed_users": int(
                db.query(func.count(User.id)).filter(User.onboarding_completed_at.isnot(None)).scalar()
                or 0
            ),
            "users_with_matches": int(
                db.query(func.count(func.distinct(JobMatch.candidate_id))).scalar() or 0
            ),
            "applications_total": int(db.query(func.count(Application.id)).scalar() or 0),
            "google_calendars_connected": int(
                db.query(func.count(UserGoogleCalendar.user_id)).scalar() or 0
            ),
            "scheduled_interviews": int(db.query(func.count(ScheduledInterview.id)).scalar() or 0),
        },
        "activation": activation,
        "instrumentation_enabled": funnel_enabled(),
        "generated_at": now.isoformat() + "Z",
    }


def build_cohort_retention(
    db: Session, *, weeks: int = 8, include_test_accounts: bool = False
) -> dict[str, Any]:
    """Signup-week cohorts with D7/D30 activity readiness from funnel events + proxies.

    D7 retained = user emitted any funnel event (excl. signup) within 7 days of signup,
    or completed onboarding within 7 days (proxy when events sparse).
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(weeks=max(1, min(weeks, 26)))
    q = db.query(User.id, User.created_at, User.onboarding_completed_at).filter(
        User.created_at >= cutoff
    )
    if not include_test_accounts:
        q = q.filter(User.exclude_from_product_metrics.is_(False))
    users = q.all()
    cohorts: dict[str, dict[str, Any]] = {}
    for uid, created, onboarded_at in users:
        key = _signup_week(created) or "unknown"
        bucket = cohorts.setdefault(
            key,
            {
                "signup_week": key,
                "signups": 0,
                "onboarded": 0,
                "d7_active": 0,
                "d30_active": 0,
                "first_match": 0,
                "first_application": 0,
            },
        )
        bucket["signups"] += 1
        if onboarded_at is not None:
            bucket["onboarded"] += 1
        if created is None:
            continue
        d7 = created + timedelta(days=7)
        d30 = created + timedelta(days=30)
        events = (
            db.query(ProductFunnelEvent.event_name, ProductFunnelEvent.occurred_at)
            .filter(ProductFunnelEvent.user_id == uid)
            .all()
        )
        names = {e for e, _ in events}
        if "first_match" in names:
            bucket["first_match"] += 1
        if "first_application" in names:
            bucket["first_application"] += 1
        active_times = [t for n, t in events if n != "signup_completed" and t is not None]
        if onboarded_at is not None:
            active_times.append(onboarded_at)
        if any(t <= d7 for t in active_times):
            bucket["d7_active"] += 1
        if any(t <= d30 for t in active_times):
            bucket["d30_active"] += 1

    rows = []
    for key in sorted(cohorts.keys(), reverse=True):
        b = cohorts[key]
        s = b["signups"] or 1
        rows.append(
            {
                **b,
                "onboarded_pct": round(100.0 * b["onboarded"] / s, 1),
                "d7_retention_pct": round(100.0 * b["d7_active"] / s, 1),
                "d30_retention_pct": round(100.0 * b["d30_active"] / s, 1),
                "first_match_pct": round(100.0 * b["first_match"] / s, 1),
                "first_application_pct": round(100.0 * b["first_application"] / s, 1),
            }
        )

    return {
        "cohorts": rows,
        "weeks_requested": weeks,
        "test_accounts_excluded": not include_test_accounts,
        "definition": {
            "d7": "Any non-signup funnel event or onboarding_completed within 7 days of signup",
            "d30": "Same within 30 days of signup",
        },
        "instrumentation_enabled": funnel_enabled(),
        "generated_at": now.isoformat() + "Z",
    }
