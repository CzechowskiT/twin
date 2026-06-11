"""Company plan & usage readiness — read-only aggregates, billing never live."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import Application, ApplicationStatus, Job, RecruiterCompanyToken
from app.services.recruiter_inbox import _require_company_slug
from app.services.recruiter_jobs import list_company_jobs
from app.utils.slug import slugify_company

DEMO_COMPANY_SLUG = "nova-hiring-pl"


def _plan_status(db: Session, slug: str) -> str:
    if slug == DEMO_COMPANY_SLUG:
        return "demo"
    has_token = (
        db.query(RecruiterCompanyToken.id)
        .filter(
            RecruiterCompanyToken.company_slug == slug,
            RecruiterCompanyToken.revoked_at.is_(None),
        )
        .first()
    )
    return "pilot" if has_token else "free"


def _roles_count(db: Session, slug: str) -> int:
    return len(list_company_jobs(db, company_slug=slug, limit=100))


def _candidates_reviewed_count(db: Session, slug: str) -> int:
    rows = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(
            Application.status.in_((ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED)),
        )
        .all()
    )
    count = 0
    for _app, job in rows:
        if slugify_company(job.company) == slug:
            count += 1
    return count


def _team_seats_count(db: Session, slug: str) -> int:
    return (
        db.query(RecruiterCompanyToken)
        .filter(
            RecruiterCompanyToken.company_slug == slug,
            RecruiterCompanyToken.revoked_at.is_(None),
        )
        .count()
    )


def _ats_webhook_configured(settings: Settings) -> bool:
    return any(
        bool((value or "").strip())
        for value in (
            settings.greenhouse_webhook_secret,
            settings.lever_webhook_secret,
            settings.ashby_webhook_secret,
        )
    )


def build_company_plan_usage(
    db: Session,
    *,
    company_slug: str,
    settings: Settings,
) -> dict:
    """Honest plan label, workspace counters, integration readiness — no payment data."""
    slug = _require_company_slug(company_slug)
    return {
        "company_slug": slug,
        "billing_live": False,
        "plan_status": _plan_status(db, slug),
        "usage": {
            "roles_count": _roles_count(db, slug),
            "candidates_reviewed": _candidates_reviewed_count(db, slug),
            "team_seats": _team_seats_count(db, slug),
        },
        "integrations": [
            {
                "id": "acceptance_inbox",
                "status": "live",
            },
            {
                "id": "ats_webhooks",
                "status": "pilot" if _ats_webhook_configured(settings) else "planned",
            },
            {
                "id": "employer_calendar",
                "status": "not_live",
            },
            {
                "id": "employer_billing",
                "status": "not_live",
            },
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
