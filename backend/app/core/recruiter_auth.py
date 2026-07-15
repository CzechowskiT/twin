"""Central recruiter access resolution — JWT (authoritative) or legacy pilot token."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import Settings
from app.core.recruiter_jwt import verify_recruiter_session_jwt
from app.services.recruiter_company_auth import resolve_recruiter_access
from app.utils.slug import slugify_company


def extract_bearer_token(authorization: str | None) -> str | None:
    raw = (authorization or "").strip()
    if not raw.lower().startswith("bearer "):
        return None
    token = raw[7:].strip()
    return token or None


def resolve_recruiter_company_slug(
    db: Session,
    settings: Settings,
    *,
    authorization: str | None = None,
    x_twin_recruiter_token: str | None = None,
    company_slug_query: str | None = None,
    legacy_query_token: str | None = None,
) -> tuple[bool, str | None, str | None]:
    """
    Resolve company slug from recruiter credential.

    Returns (ok, company_slug, error_code).
    error_code: unavailable | invalid_token | company_required | tenant_mismatch
    """
    bearer = extract_bearer_token(authorization)
    if bearer:
        claims = verify_recruiter_session_jwt(bearer)
        if not claims:
            return False, None, "invalid_token"
        q = (company_slug_query or "").strip()
        if q:
            q_slug = slugify_company(q)
            if q_slug != claims.tenant:
                return False, None, "tenant_mismatch"
        return True, claims.tenant, None

    header_or_legacy = (x_twin_recruiter_token or legacy_query_token or "").strip()
    if not header_or_legacy:
        if not (settings.recruiter_inbox_token or "").strip():
            return False, None, "unavailable"
        return False, None, "invalid_token"

    ok, slug = resolve_recruiter_access(db, settings, header_or_legacy, company_slug_query)
    if not ok:
        if not (settings.recruiter_inbox_token or "").strip():
            return False, None, "unavailable"
        return False, None, "invalid_token"
    if not slug:
        return False, None, "company_required"
    return True, slug, None
