"""Partner integrator token verification (DB keys + legacy env token)."""

from __future__ import annotations

import hashlib
import secrets

from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import PartnerApiKey


def hash_partner_token(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


def mint_partner_api_key(db: Session, *, label: str, scopes: str = "export") -> tuple[PartnerApiKey, str]:
    """Create a new key; returns row and plaintext token (shown once)."""
    raw = secrets.token_urlsafe(32)
    row = PartnerApiKey(
        label=label.strip()[:120] or "partner",
        token_hash=hash_partner_token(raw),
        scopes=(scopes or "export").strip()[:255],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row, raw


def verify_partner_token(db: Session, settings: Settings, raw_token: str | None) -> tuple[bool, str]:
    """Return (ok, scopes_csv). Empty scopes means invalid."""
    token = (raw_token or "").strip()
    if not token:
        return False, ""
    digest = hash_partner_token(token)
    row = (
        db.query(PartnerApiKey)
        .filter(PartnerApiKey.token_hash == digest, PartnerApiKey.revoked_at.is_(None))
        .first()
    )
    if row:
        return True, (row.scopes or "export")
    legacy = (settings.partner_export_token or "").strip()
    if legacy and token == legacy:
        return True, "export"
    return False, ""


def revoke_partner_api_key(db: Session, *, key_id: int) -> None:
    row = db.query(PartnerApiKey).filter(PartnerApiKey.id == key_id).first()
    if not row:
        raise ValueError("Partner API key not found.")
    if row.revoked_at is not None:
        raise ValueError("Key already revoked.")
    from datetime import datetime, timezone

    row.revoked_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()


def partner_has_scope(scopes_csv: str, required: str) -> bool:
    parts = {p.strip().lower() for p in (scopes_csv or "").split(",") if p.strip()}
    return required.lower() in parts or "export" in parts


def partner_export_configured(db: Session, settings: Settings) -> bool:
    """True when legacy env token or at least one active DB key exists."""
    if (settings.partner_export_token or "").strip():
        return True
    return (
        db.query(PartnerApiKey)
        .filter(PartnerApiKey.revoked_at.is_(None))
        .limit(1)
        .first()
        is not None
    )
