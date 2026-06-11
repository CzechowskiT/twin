"""Company billing readiness — honest plan/usage snapshot, no Stripe checkout."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import Application, ApplicationStatus, Job, RecruiterCompanyToken
from app.services.company_roles import list_company_roles
from app.services.recruiter_company_auth import hash_recruiter_token, resolve_recruiter_access
from app.services.recruiter_inbox import _require_company_slug

RECRUITER_DEMO_COMPANY_SLUG = "nova-hiring-pl"

INTEGRATION_ROWS = (
    ("acceptance_inbox", "live"),
    ("ats_webhooks", "planned"),
    ("employer_calendar", "not_live"),
    ("employer_billing", "not_live"),
)


def _plan_kind(db: Session, settings: Settings, *, company_slug: str, raw_token: str | None) -> str:
    slug = _require_company_slug(company_slug)
    token = (raw_token or "").strip()
    demo_slug = RECRUITER_DEMO_COMPANY_SLUG
    if demo_slug and slug == demo_slug:
        return "demo"
    if token:
        ok, _ = resolve_recruiter_access(db, settings, token, slug)
        if ok:
            return "pilot"
    digest = hash_recruiter_token(token) if token else None
    if digest:
        row = (
            db.query(RecruiterCompanyToken.id)
            .filter(
                RecruiterCompanyToken.company_slug == slug,
                RecruiterCompanyToken.token_hash == digest,
                RecruiterCompanyToken.revoked_at.is_(None),
            )
            .first()
        )
        if row:
            return "pilot"
    return "free"


def _reviewed_count(db: Session, company_slug: str) -> int:
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(func.count(Application.id))
        .join(Job, Application.job_id == Job.id)
        .filter(
            Job.job_board == "employer",
            Job.external_id.like(f"{slug}-%"),
            Application.status.in_(
                (
                    ApplicationStatus.INTERVIEW,
                    ApplicationStatus.REJECTED,
                )
            ),
        )
        .scalar()
    )
    return int(rows or 0)


def build_company_plan_usage(
    db: Session,
    *,
    company_slug: str,
    settings: Settings,
    raw_token: str | None = None,
) -> dict:
    slug = _require_company_slug(company_slug)
    roles = list_company_roles(db, company_slug=slug, limit=100)
    open_roles = sum(1 for r in roles if (r.get("status") or "") in ("active", "draft"))
    seats = (
        db.query(func.count(RecruiterCompanyToken.id))
        .filter(
            RecruiterCompanyToken.company_slug == slug,
            RecruiterCompanyToken.revoked_at.is_(None),
        )
        .scalar()
    )
    plan = _plan_kind(db, settings, company_slug=slug, raw_token=raw_token)
    return {
        "company_slug": slug,
        "source": "workspace",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "billing_live": False,
        "plan": plan,
        "usage": {
            "open_roles": open_roles,
            "reviewed_candidates": _reviewed_count(db, slug),
            "team_seats": int(seats or 0),
        },
        "integrations": [
            {"key": key, "status": status}
            for key, status in INTEGRATION_ROWS
        ],
    }
