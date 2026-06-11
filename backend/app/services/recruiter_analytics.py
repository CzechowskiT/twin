"""Recruiter workspace analytics — read-only aggregates, no PII."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, Job, RecruiterAuditEvent
from app.services.recruiter_inbox import _require_company_slug


def build_recruiter_analytics(db: Session, *, company_slug: str, days: int = 7) -> dict:
    slug = _require_company_slug(company_slug)
    since = datetime.now(timezone.utc) - timedelta(days=max(1, min(days, 30)))

    apps = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Job.job_board == "employer", Job.external_id.like(f"{slug}-%"))
        .all()
    )

    status_counts: dict[str, int] = {}
    for app, _job in apps:
        key = app.status.value if hasattr(app.status, "value") else str(app.status)
        status_counts[key] = status_counts.get(key, 0) + 1

    audit_q = (
        db.query(RecruiterAuditEvent.action_type, func.count(RecruiterAuditEvent.id))
        .filter(
            RecruiterAuditEvent.company_slug == slug,
            RecruiterAuditEvent.created_at >= since,
        )
        .group_by(RecruiterAuditEvent.action_type)
    )
    audit_counts = {row[0]: int(row[1]) for row in audit_q.all()}

    decisions = audit_counts.get("decision_accept", 0) + audit_counts.get("decision_decline", 0)

    return {
        "company_slug": slug,
        "source": "workspace",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "window_days": days,
        "applications_total": len(apps),
        "applications_by_status": status_counts,
        "audit_events_total": sum(audit_counts.values()),
        "audit_decisions": decisions,
        "audit_reviews_opened": audit_counts.get("review_opened", 0),
        "calendar_sync_live": False,
        "readiness": {
            "public_launch": False,
            "analytics_export": False,
        },
    }
