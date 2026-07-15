"""Recruiter session JWT — canonical contract (HS256, iss/aud/role/tenant)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import get_settings

RECRUITER_JWT_ALGORITHM = "HS256"
RECRUITER_JWT_ALGORITHMS: frozenset[str] = frozenset({RECRUITER_JWT_ALGORITHM})
RECRUITER_JWT_ISSUER = "twin-api"
RECRUITER_JWT_AUDIENCE = "twin-recruiter"
RECRUITER_JWT_ROLE = "recruiter"


@dataclass(frozen=True)
class RecruiterJwtClaims:
    """Verified recruiter session claims — tenant is authoritative company slug."""

    tenant: str
    sub: str
    exp: int
    nbf: int


def mint_recruiter_session_jwt(
    company_slug: str,
    *,
    expires_minutes: int | None = None,
) -> str:
    settings = get_settings()
    ttl = (
        expires_minutes
        if expires_minutes is not None
        else settings.recruiter_jwt_expire_minutes
    )
    now = datetime.now(timezone.utc)
    nbf = int(now.timestamp())
    exp = int((now + timedelta(minutes=ttl)).timestamp())
    slug = company_slug.strip()
    payload = {
        "sub": slug,
        "iss": RECRUITER_JWT_ISSUER,
        "aud": RECRUITER_JWT_AUDIENCE,
        "role": RECRUITER_JWT_ROLE,
        "tenant": slug,
        "nbf": nbf,
        "exp": exp,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=RECRUITER_JWT_ALGORITHM)


def verify_recruiter_session_jwt(token: str) -> RecruiterJwtClaims | None:
    """Authoritative JWT verification — rejects alg=none, wrong iss/aud/role, missing tenant."""
    settings = get_settings()
    raw = (token or "").strip()
    if not raw:
        return None
    try:
        payload = jwt.decode(
            raw,
            settings.secret_key,
            algorithms=list(RECRUITER_JWT_ALGORITHMS),
            audience=RECRUITER_JWT_AUDIENCE,
            issuer=RECRUITER_JWT_ISSUER,
            options={
                "require_exp": True,
                "require_nbf": True,
                "require_sub": True,
            },
        )
    except JWTError:
        return None
    if payload.get("role") != RECRUITER_JWT_ROLE:
        return None
    tenant = payload.get("tenant")
    if not isinstance(tenant, str) or not tenant.strip():
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    return RecruiterJwtClaims(
        tenant=tenant.strip(),
        sub=str(sub),
        exp=int(payload["exp"]),
        nbf=int(payload["nbf"]),
    )
