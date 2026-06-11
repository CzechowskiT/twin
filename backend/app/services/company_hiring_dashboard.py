"""Company hiring dashboard aggregates — roles, pipeline, team readiness (no PII)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import Settings
from app.services.company_pipeline_quality import build_company_pipeline_quality
from app.services.company_roles import list_company_roles
from app.services.company_team import build_company_team_readiness
from app.services.recruiter_inbox import _require_company_slug


def build_company_hiring_dashboard(
    db: Session,
    settings: Settings,
    *,
    company_slug: str,
    raw_token: str | None,
    locale: str = "en",
) -> dict:
    """Executive snapshot for one employer workspace — honest pilot metrics only."""
    slug = _require_company_slug(company_slug)
    roles = list_company_roles(db, company_slug=slug, limit=100)
    pipeline = build_company_pipeline_quality(db, company_slug=slug, locale=locale)
    team = build_company_team_readiness(db, settings, company_slug=slug, raw_token=raw_token)

    active_roles = sum(1 for r in roles if (r.get("status") or "") == "active")
    draft_roles = sum(1 for r in roles if (r.get("status") or "") == "draft")

    return {
        "company_slug": slug,
        "source": "workspace",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "roles_total": len(roles),
        "roles_active": active_roles,
        "roles_draft": draft_roles,
        "pipeline_total_applications": pipeline.get("total_applications", 0),
        "pipeline_segments": pipeline.get("company_totals") or {},
        "average_match_score": pipeline.get("average_match_score"),
        "team_tokens": len(team.get("access_tokens") or []),
        "session_authenticated": bool((team.get("session") or {}).get("authenticated")),
        "readiness": {
            "billing_live": False,
            "public_launch": False,
            "invites_live": bool((team.get("readiness") or {}).get("invites_live")),
        },
        "links": {
            "roles": "/company/roles",
            "pipeline": "/company/pipeline",
            "team": "/company/team",
            "inbox": "/recruiter/inbox",
        },
    }
