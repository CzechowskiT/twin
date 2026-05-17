"""Assign unique ``User.referral_public_token`` for share-link UTM attribution."""

from __future__ import annotations

import secrets

from sqlalchemy.orm import Session

from app.database.models import User


def _token_candidate() -> str:
    """Return a 12–16 character URL-safe token (no padding)."""
    raw = secrets.token_urlsafe(12).replace("=", "")
    if len(raw) < 12:
        raw = secrets.token_urlsafe(16).replace("=", "")
    return raw[:16]


def ensure_user_referral_public_token(db: Session, user: User) -> str:
    """Ensure ``user.referral_public_token`` is set; caller should commit when appropriate."""
    if user.referral_public_token:
        return user.referral_public_token
    for _ in range(40):
        cand = _token_candidate()
        exists = db.query(User.id).filter(User.referral_public_token == cand).first()
        if not exists:
            user.referral_public_token = cand
            db.add(user)
            return cand
    raise RuntimeError("Could not allocate referral_public_token")
