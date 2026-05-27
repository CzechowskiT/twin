"""Public cookie-banner consent audit (optional JWT links row to user)."""

from __future__ import annotations

import hashlib
import json
from datetime import timezone

from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.models import CookieConsentEvent, User
from app.database.session import get_db
from app.limiter import limiter
from app.schemas.cookie_consent import CookieConsentIn, CookieConsentOut

router = APIRouter()
oauth2_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def _optional_user(
    db: Session = Depends(get_db),
    token: str | None = Depends(oauth2_optional),
) -> User | None:
    if not token:
        return None
    email = decode_access_token(token)
    if not email:
        return None
    return db.query(User).filter(User.email == email, User.is_active.is_(True)).first()


def _hash_visitor(visitor_id: str) -> str:
    return hashlib.sha256(visitor_id.encode("utf-8")).hexdigest()


@router.post("/cookies", response_model=CookieConsentOut)
@limiter.limit("30/minute")
def record_cookie_consent(
    request: Request,
    body: CookieConsentIn,
    db: Session = Depends(get_db),
    user: User | None = Depends(_optional_user),
) -> CookieConsentOut:
    decided = body.decided_at
    if decided.tzinfo is None:
        decided = decided.replace(tzinfo=timezone.utc)
    else:
        decided = decided.astimezone(timezone.utc)

    choices = {
        "necessary": True,
        "analytics": body.analytics,
        "marketing": body.marketing,
    }
    row = CookieConsentEvent(
        user_id=user.id if user else None,
        visitor_key_hash=_hash_visitor(body.visitor_id.strip()),
        consent_version=body.version,
        choices_json=json.dumps(choices, separators=(",", ":")),
        decided_at=decided.replace(tzinfo=None),
    )
    db.add(row)
    db.commit()
    return CookieConsentOut()
