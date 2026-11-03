"""Activation TTV latency percentiles + quality alerts (non-PII)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import ActivationMatchingJob, ProductFunnelEvent, User

logger = logging.getLogger(__name__)

# Ordered pairs for TTV: (key, start_event, end_event, percentiles)
TTV_PAIRS: list[tuple[str, str, str, tuple[int, ...]]] = [
    ("signup_to_onboarding", "signup_completed", "onboarding_completed", (50, 75, 90)),
    ("onboarding_to_matching_dispatched", "onboarding_completed", "activation_matching_dispatched", (50, 90)),
    ("matching_dispatched_to_first_match", "activation_matching_dispatched", "activation_first_match_created", (50, 90)),
    ("onboarding_to_first_match", "onboarding_completed", "first_match", (50, 75, 90)),
    ("signup_to_first_match", "signup_completed", "first_match", (50, 75, 90)),
    ("first_match_to_matches_viewed", "first_match", "activation_ttv_matches_view", (50, 75, 90)),
    ("first_match_to_application", "first_match", "first_application", (50, 75, 90)),
    ("first_match_to_interview", "first_match", "interview_scheduled", (50, 75, 90)),
]


def percentile(sorted_vals: list[float], p: int) -> float | None:
    """Nearest-rank percentile; None when empty (never fake 0)."""
    if not sorted_vals:
        return None
    if p <= 0:
        return sorted_vals[0]
    if p >= 100:
        return sorted_vals[-1]
    k = max(1, int(round(len(sorted_vals) * (p / 100.0))))
    return sorted_vals[min(len(sorted_vals), k) - 1]


def _excluded_user_ids(db: Session, *, include_test: bool) -> set[int] | None:
    """None means no filter; otherwise set of user ids to exclude."""
    if include_test:
        return set()
    rows = (
        db.query(User.id)
        .filter(User.exclude_from_product_metrics.is_(True))
        .all()
    )
    return {r[0] for r in rows}


def _first_event_times(
    db: Session,
    *,
    event_name: str,
    since: datetime | None,
    until: datetime | None,
    persona: str | None,
    exclude_ids: set[int],
) -> dict[int, datetime]:
    q = db.query(
        ProductFunnelEvent.user_id,
        func.min(ProductFunnelEvent.occurred_at),
    ).filter(
        ProductFunnelEvent.event_name == event_name,
        ProductFunnelEvent.user_id.isnot(None),
    )
    if since is not None:
        q = q.filter(ProductFunnelEvent.occurred_at >= since)
    if until is not None:
        q = q.filter(ProductFunnelEvent.occurred_at <= until)
    if persona:
        q = q.filter(ProductFunnelEvent.persona == persona)
    if exclude_ids:
        q = q.filter(~ProductFunnelEvent.user_id.in_(tuple(exclude_ids)))
    q = q.group_by(ProductFunnelEvent.user_id)
    return {int(uid): ts for uid, ts in q.all() if uid is not None and ts is not None}


def build_ttv_latencies(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    persona: str | None = "candidate",
    include_test_accounts: bool = False,
    cohort: str | None = None,
) -> dict[str, Any]:
    """Compute TTV latency percentiles; null + sample_size when no data."""
    settings = get_settings()
    if not settings.activation_ttv_metrics_enabled:
        return {
            "enabled": False,
            "pairs": {},
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }

    exclude_ids = _excluded_user_ids(db, include_test=include_test_accounts) or set()
    pairs_out: dict[str, Any] = {}

    for key, start_name, end_name, pcts in TTV_PAIRS:
        # Cohort window applies to start event time (users who started in window)
        starts = _first_event_times(
            db,
            event_name=start_name,
            since=date_from,
            until=date_to,
            persona=persona,
            exclude_ids=exclude_ids,
        )
        if cohort:
            starts = {
                uid: ts
                for uid, ts in starts.items()
                if _signup_week_match(db, uid, cohort)
            }
        ends = _first_event_times(
            db,
            event_name=end_name,
            since=None,
            until=None,
            persona=persona,
            exclude_ids=exclude_ids,
        )
        deltas: list[float] = []
        incomplete = 0
        for uid, t0 in starts.items():
            t1 = ends.get(uid)
            if t1 is None:
                incomplete += 1
                continue
            # Guard out-of-order / delayed: require end >= start
            delta = (t1 - t0).total_seconds()
            if delta < 0:
                incomplete += 1
                continue
            deltas.append(delta)
        deltas.sort()
        sample = len(deltas)
        lat: dict[str, Any] = {
            "sample_size": sample,
            "incomplete_users": incomplete,
            "start_event": start_name,
            "end_event": end_name,
        }
        for p in pcts:
            lat[f"p{p}_seconds"] = percentile(deltas, p) if sample else None
        pairs_out[key] = lat

    return {
        "enabled": True,
        "include_test_accounts": include_test_accounts,
        "persona": persona,
        "cohort": cohort,
        "date_from": date_from.isoformat() + "Z" if date_from else None,
        "date_to": date_to.isoformat() + "Z" if date_to else None,
        "pairs": pairs_out,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


def _signup_week_match(db: Session, user_id: int, cohort: str) -> bool:
    from app.services.product_funnel import _signup_week

    created = db.query(User.created_at).filter(User.id == user_id).scalar()
    return _signup_week(created) == cohort


def build_activation_funnel_extension(
    db: Session,
    *,
    days: int = 30,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    persona: str | None = "candidate",
    include_test_accounts: bool = False,
    cohort: str | None = None,
    environment: str | None = None,
) -> dict[str, Any]:
    """Activation-oriented funnel: steps, rates, TTV, failures, stuck, freshness, alerts."""
    settings = get_settings()
    now = datetime.utcnow()
    if date_from is None:
        date_from = now - timedelta(days=max(1, min(days, 365)))
    if date_to is None:
        date_to = now

    exclude_ids = _excluded_user_ids(db, include_test=include_test_accounts) or set()

    step_events = [
        "signup_completed",
        "onboarding_completed",
        "activation_matching_eligible",
        "activation_matching_not_eligible",
        "activation_matching_dispatched",
        "activation_matching_started",
        "activation_matching_completed",
        "activation_matching_failed",
        "activation_first_match_created",
        "first_match",
        "activation_ttv_matches_view",
        "first_application",
        "interview_scheduled",
    ]

    def _count(event_name: str) -> int:
        q = db.query(func.count(func.distinct(ProductFunnelEvent.user_id))).filter(
            ProductFunnelEvent.event_name == event_name,
            ProductFunnelEvent.user_id.isnot(None),
            ProductFunnelEvent.occurred_at >= date_from,
            ProductFunnelEvent.occurred_at <= date_to,
        )
        if persona:
            q = q.filter(ProductFunnelEvent.persona == persona)
        if exclude_ids:
            q = q.filter(~ProductFunnelEvent.user_id.in_(tuple(exclude_ids)))
        if cohort:
            # Filter via signup_week column (indexed)
            q = q.filter(ProductFunnelEvent.signup_week == cohort)
        return int(q.scalar() or 0)

    steps = {name: _count(name) for name in step_events}
    onboarded = steps.get("onboarding_completed", 0)
    first_match = steps.get("first_match", 0) or steps.get("activation_first_match_created", 0)
    failed = steps.get("activation_matching_failed", 0)
    not_eligible = steps.get("activation_matching_not_eligible", 0)
    dispatched = steps.get("activation_matching_dispatched", 0)

    def rate(num: int, den: int) -> float | None:
        if den <= 0:
            return None
        return round(num / den, 4)

    # Stuck: jobs in pending/dispatched/started older than threshold
    stuck_age = timedelta(seconds=max(60, int(settings.activation_stuck_max_age_seconds)))
    stuck_q = db.query(func.count(ActivationMatchingJob.id)).filter(
        ActivationMatchingJob.status.in_(("pending", "dispatched", "started")),
        ActivationMatchingJob.created_at <= now - stuck_age,
    )
    if exclude_ids:
        stuck_q = stuck_q.filter(~ActivationMatchingJob.user_id.in_(tuple(exclude_ids)))
    stuck_users = int(stuck_q.scalar() or 0)

    retries = int(
        db.query(func.coalesce(func.sum(ActivationMatchingJob.retry_count), 0)).scalar() or 0
    )

    without_first_match = max(0, onboarded - first_match)

    # Freshness: latest funnel event in window
    fresh_q = db.query(func.max(ProductFunnelEvent.occurred_at)).filter(
        ProductFunnelEvent.occurred_at >= date_from,
        ProductFunnelEvent.occurred_at <= date_to,
    )
    latest = fresh_q.scalar()
    freshness_seconds = (now - latest).total_seconds() if latest else None

    # Instrumentation silence: new onboardings but no activation events
    recent_onboarding = steps.get("onboarding_completed", 0)
    activation_emits = (
        steps.get("activation_matching_eligible", 0)
        + steps.get("activation_matching_not_eligible", 0)
        + steps.get("activation_matching_dispatched", 0)
    )

    ttv = build_ttv_latencies(
        db,
        date_from=date_from,
        date_to=date_to,
        persona=persona,
        include_test_accounts=include_test_accounts,
        cohort=cohort,
    )

    alerts = evaluate_activation_alerts(
        onboarded=onboarded,
        first_match=first_match,
        failed=failed,
        dispatched=dispatched,
        stuck_users=stuck_users,
        recent_onboarding=recent_onboarding,
        activation_emits=activation_emits,
        ttv=ttv,
        freshness_seconds=freshness_seconds,
    )

    return {
        "cohort_definition": {
            "window": "users with funnel events in [date_from, date_to]",
            "persona": persona,
            "signup_week_filter": cohort,
            "include_test_accounts": include_test_accounts,
            "environment": environment or "unspecified",
        },
        "date_from": date_from.isoformat() + "Z",
        "date_to": date_to.isoformat() + "Z",
        "window_days": days,
        "sample_size": onboarded,
        "steps": steps,
        "conversion_rates": {
            "signup_to_onboarding": rate(steps["onboarding_completed"], steps["signup_completed"]),
            "onboarding_to_dispatched": rate(dispatched, onboarded),
            "onboarding_to_first_match": rate(first_match, onboarded),
            "eligible_to_first_match": rate(
                first_match, steps.get("activation_matching_eligible", 0)
            ),
            "first_match_to_view": rate(
                steps.get("activation_ttv_matches_view", 0), first_match
            ),
            "first_match_to_application": rate(steps.get("first_application", 0), first_match),
            "first_match_to_interview": rate(steps.get("interview_scheduled", 0), first_match),
        },
        "users_without_first_match": without_first_match,
        "matching_failures": failed,
        "not_eligible": not_eligible,
        "retries_total": retries,
        "stuck_users": stuck_users,
        "freshness": {
            "latest_event_at": latest.isoformat() + "Z" if latest else None,
            "seconds_since_latest": freshness_seconds,
        },
        "ttv_latencies": ttv,
        "alerts": alerts,
        "instrumentation_enabled": bool(settings.product_funnel_events_enabled),
        "activation_auto_matching_enabled": bool(settings.activation_auto_matching_enabled),
        "activation_ttv_metrics_enabled": bool(settings.activation_ttv_metrics_enabled),
        "activation_ttv_alerts_enabled": bool(settings.activation_ttv_alerts_enabled),
        "generated_at": now.isoformat() + "Z",
    }


def evaluate_activation_alerts(
    *,
    onboarded: int,
    first_match: int,
    failed: int,
    dispatched: int,
    stuck_users: int,
    recent_onboarding: int,
    activation_emits: int,
    ttv: dict[str, Any],
    freshness_seconds: float | None,
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.activation_ttv_alerts_enabled:
        return {"enabled": False, "signals": [], "suppressed_low_sample": False}

    min_n = max(1, int(settings.activation_alerts_min_sample_size))
    signals: list[dict[str, Any]] = []
    suppressed = onboarded < min_n

    if not suppressed:
        rate = (first_match / onboarded) if onboarded else 0.0
        if rate < float(settings.activation_first_match_min_rate):
            signals.append(
                {
                    "code": "first_match_rate_low",
                    "severity": True,
                    "value": round(rate, 4),
                    "threshold": float(settings.activation_first_match_min_rate),
                }
            )
        fail_den = max(dispatched, 1)
        fail_rate = failed / fail_den
        if fail_rate > float(settings.activation_matching_failure_rate_max):
            signals.append(
                {
                    "code": "matching_failure_rate_high",
                    "severity": True,
                    "value": round(fail_rate, 4),
                    "threshold": float(settings.activation_matching_failure_rate_max),
                }
            )
        pair = (ttv.get("pairs") or {}).get("onboarding_to_first_match") or {}
        p90 = pair.get("p90_seconds")
        if p90 is not None and float(p90) > float(settings.activation_first_match_p90_max_seconds):
            signals.append(
                {
                    "code": "onboarding_to_first_match_p90_high",
                    "severity": True,
                    "value": float(p90),
                    "threshold": float(settings.activation_first_match_p90_max_seconds),
                }
            )

    if stuck_users > 0 and (not suppressed or stuck_users >= 3):
        signals.append(
            {
                "code": "stuck_matching_jobs",
                "severity": True,
                "value": stuck_users,
                "threshold": 0,
            }
        )

    if recent_onboarding > 0 and activation_emits == 0 and settings.activation_auto_matching_enabled:
        signals.append(
            {
                "code": "instrumentation_silent",
                "severity": True,
                "value": recent_onboarding,
                "threshold": 0,
            }
        )

    # Worker not consuming: freshness very stale while pending jobs exist — surface as signal
    if freshness_seconds is not None and freshness_seconds > float(settings.activation_stuck_max_age_seconds):
        if stuck_users > 0:
            signals.append(
                {
                    "code": "worker_not_consuming",
                    "severity": True,
                    "value": int(freshness_seconds),
                    "threshold": int(settings.activation_stuck_max_age_seconds),
                }
            )

    return {
        "enabled": True,
        "min_sample_size": min_n,
        "suppressed_low_sample": suppressed,
        "signals": signals,
        # Never include PII
        "pii": False,
    }
