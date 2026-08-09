"""Epic 2.19 — public recipient Career Pack share (no auth /me).

Bearer exchange via POST; short HttpOnly cookie; generic failures.
No signup CTA, no analytics, noindex headers.
"""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import Response as RawResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.services import candidate_career_pack_share as cps
from app.services.candidate_career_pack_share_constants import (
    COOKIE_MAX_AGE_SECONDS,
    COOKIE_NAME,
    EXCHANGE_RATE_LIMIT_PER_MINUTE,
)

router = APIRouter()

# In-memory rate limit (per process) — fail closed under abuse
_exchange_hits: dict[str, list[float]] = defaultdict(list)


def _no_store_private(response: Response) -> None:
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive, nosnippet"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    )


def _rate_limit(key: str) -> bool:
    now = time.time()
    window = _exchange_hits[key]
    _exchange_hits[key] = [t for t in window if now - t < 60]
    if len(_exchange_hits[key]) >= EXCHANGE_RATE_LIMIT_PER_MINUTE:
        return False
    _exchange_hits[key].append(now)
    return True


class ExchangeIn(BaseModel):
    secret: str = Field(min_length=8, max_length=200)


@router.get("/share/career-pack/{public_id}/meta")
def share_meta(public_id: str, response: Response) -> dict:
    """Public meta only — never reveals grant validity (anti-enumeration)."""
    _no_store_private(response)
    _ = public_id
    return {
        "schema_id": "twin.candidate_career_pack_share_grant/v1",
        "requires_exchange": True,
        "signup_cta": False,
        "tracking": False,
        "robots": "noindex,nofollow",
    }


@router.post("/share/career-pack/{public_id}/exchange")
def exchange(
    public_id: str,
    body: ExchangeIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    _no_store_private(response)
    ip = request.client.host if request.client else "unknown"
    if not _rate_limit(f"{ip}:{public_id[:16]}"):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="unavailable")
    ok, token = cps.exchange_secret(db, public_id=public_id, secret=body.secret.strip())
    if not ok or not token:
        # Generic failure — same shape always
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="unavailable")
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/api/v1/share/career-pack",
    )
    # Token also returned once for credentialed clients / same-origin BFF; never logged.
    return {
        "ok": True,
        "session_token": token,
        "signup_cta": False,
        "tracking": False,
    }


def _session_token(request: Request) -> str:
    header = request.headers.get("X-Twin-Share-Session") or ""
    if header.strip():
        return header.strip()
    return request.cookies.get(COOKIE_NAME) or ""


@router.get("/share/career-pack/{public_id}/view")
def view(
    public_id: str,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    _no_store_private(response)
    token = _session_token(request)
    try:
        return cps.recipient_view(db, public_id=public_id, session_token=token)
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="unavailable") from None


@router.get("/share/career-pack/{public_id}/download")
def download(
    public_id: str,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    format: str = "pdf",
) -> RawResponse:
    _no_store_private(response)
    token = _session_token(request)
    try:
        data, filename, media = cps.recipient_download(
            db, public_id=public_id, session_token=token, fmt=format
        )
    except LookupError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="unavailable") from None
    except ValueError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="unavailable") from None
    return RawResponse(
        content=data,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex, nofollow",
            "Referrer-Policy": "no-referrer",
        },
    )
