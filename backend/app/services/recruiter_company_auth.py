"""Recruiter inbox tokens — global pilot secret or per-company hashed keys."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import RecruiterCompanyToken


def hash_recruiter_token(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


def mint_recruiter_company_token(
    db: Session,
    *,
    company_slug: str,
    label: str,
) -> tuple[RecruiterCompanyToken, str]:
    from app.utils.slug import slugify_company

    slug = slugify_company(company_slug.strip())
    raw = secrets.token_urlsafe(32)
    row = RecruiterCompanyToken(
        company_slug=slug,
        label=label.strip()[:120] or slug,
        token_hash=hash_recruiter_token(raw),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row, raw


def revoke_recruiter_company_token(db: Session, *, token_id: int) -> None:
    row = db.query(RecruiterCompanyToken).filter(RecruiterCompanyToken.id == token_id).first()
    if not row:
        raise ValueError("Recruiter token not found.")
    if row.revoked_at is not None:
        raise ValueError("Token already revoked.")
    row.revoked_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()


def resolve_recruiter_access(
    db: Session,
    settings: Settings,
    raw_token: str | None,
    company_slug_query: str | None,
) -> tuple[bool, str | None]:
    """Return (ok, resolved_company_slug). Slug from DB row when using company token."""
    token = (raw_token or "").strip()
    if not token:
        return False, None
    global_secret = (settings.recruiter_inbox_token or "").strip()
    if global_secret and token == global_secret:
        q = (company_slug_query or "").strip()
        if not q:
            return True, None
        from app.utils.slug import slugify_company

        return True, slugify_company(q)
    digest = hash_recruiter_token(token)
    row = (
        db.query(RecruiterCompanyToken)
        .filter(RecruiterCompanyToken.token_hash == digest, RecruiterCompanyToken.revoked_at.is_(None))
        .first()
    )
    if row:
        return True, row.company_slug
    return False, None
