"""Company team & permissions readiness — token labels and session only (no RBAC yet)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import RecruiterCompanyToken
from app.services.recruiter_company_auth import hash_recruiter_token, resolve_recruiter_access
from app.services.recruiter_inbox import _require_company_slug


def build_company_team_readiness(
    db: Session,
    settings: Settings,
    *,
    company_slug: str,
    raw_token: str | None,
) -> dict:
    """Read-only team surface: labeled access tokens + current session, no invites or members."""
    slug = _require_company_slug(company_slug)
    token = (raw_token or "").strip()
    digest = hash_recruiter_token(token) if token else None

    rows = (
        db.query(RecruiterCompanyToken)
        .filter(
            RecruiterCompanyToken.company_slug == slug,
            RecruiterCompanyToken.revoked_at.is_(None),
        )
        .order_by(RecruiterCompanyToken.created_at.asc())
        .all()
    )

    ok, resolved_slug = resolve_recruiter_access(db, settings, token or None, slug)
    global_secret = (settings.recruiter_inbox_token or "").strip()
    session_kind = "none"
    session_label: str | None = None
    if token and global_secret and token == global_secret:
        session_kind = "global_pilot"
        session_label = "global_pilot"
    elif digest and any(r.token_hash == digest for r in rows):
        session_kind = "company_token"
        match = next(r for r in rows if r.token_hash == digest)
        session_label = match.label

    access_tokens: list[dict] = []
    for row in rows:
        access_tokens.append(
            {
                "id": row.id,
                "label": row.label,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "is_current_session": bool(digest and row.token_hash == digest),
            }
        )

    return {
        "company_slug": slug,
        "readiness": {
            "invites_live": False,
            "rbac_live": False,
            "membership_model_live": False,
        },
        "session": {
            "authenticated": ok and resolved_slug == slug,
            "kind": session_kind,
            "label": session_label,
            "company_slug": slug,
        },
        "access_tokens": access_tokens,
    }
