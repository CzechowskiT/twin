"""Recruiter analytics — read-only workspace aggregates (no fake traction)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, Job, RecruiterAuditEvent, RecruiterPipelineStatus
from app.services.recruiter_inbox import _require_company_slug
from app.utils.slug import slugify_company


def build_recruiter_analytics(db: Session, *, company_slug: str) -> dict:
    slug = _require_company_slug(company_slug)
    since = datetime.now(timezone.utc) - timedelta(days=7)

    rows = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(
            Application.status.in_(
                (
                    ApplicationStatus.PENDING,
                    ApplicationStatus.APPLIED,
                    ApplicationStatus.INTERVIEW,
                    ApplicationStatus.REJECTED,
                )
            ),
        )
        .all()
    )
    apps = [(a, j) for a, j in rows if slugify_company(j.company) == slug]

    in_review = sum(1 for a, _ in apps if a.status == ApplicationStatus.APPLIED)
    accepted = sum(1 for a, _ in apps if a.status == ApplicationStatus.INTERVIEW)
    rejected = sum(1 for a, _ in apps if a.status == ApplicationStatus.REJECTED)

    pipeline_counts: dict[str, int] = {s.value: 0 for s in RecruiterPipelineStatus}
    for app, _ in apps:
        ps = (app.recruiter_pipeline_status or "").strip()
        if ps in pipeline_counts:
            pipeline_counts[ps] += 1

    audit_events = (
        db.query(func.count(RecruiterAuditEvent.id))
        .filter(
            RecruiterAuditEvent.company_slug == slug,
            RecruiterAuditEvent.created_at >= since,
        )
        .scalar()
    )
    decisions = (
        db.query(func.count(RecruiterAuditEvent.id))
        .filter(
            RecruiterAuditEvent.company_slug == slug,
            RecruiterAuditEvent.created_at >= since,
            RecruiterAuditEvent.action_type.in_(("decision_accept", "decision_decline")),
        )
        .scalar()
    )

    return {
        "company_slug": slug,
        "source": "workspace",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "window_days": 7,
        "inbox": {
            "in_review": in_review,
            "accepted": accepted,
            "rejected": rejected,
            "total_tracked": len(apps),
        },
        "pipeline_stages": pipeline_counts,
        "activity": {
            "audit_events_7d": int(audit_events or 0),
            "decisions_logged_7d": int(decisions or 0),
        },
        "readiness": {
            "export_live": False,
            "bi_live": False,
        },
    }
