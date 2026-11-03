"""Epic 2.19 — private Career Pack share grants (bearer, revocable).

TWIN never sends the link. No recipient PII stored. No access analytics.
Grant binds to immutable pack snapshot + disclosure hash — never regenerates.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateCareerPack,
    CandidateCareerPackAudit,
    CandidateCareerPackShareGrant,
    CandidateLifecyclePrivacy,
)
from app.services.candidate_career_pack_share_constants import (
    ACCESS_ANALYTICS,
    COOKIE_MAX_AGE_SECONDS,
    COOKIE_NAME,
    CONTRACT_ID,
    DEFAULT_TTL_HOURS,
    EIGHTH_PRIMARY_NAV,
    EMAIL_SEND,
    FIRST_VALUE_CONTRACT,
    FIRST_VALUE_SATISFIED_BY_SHARE_GRANT,
    MAX_ACTIVE_GRANTS_PER_CANDIDATE,
    MAX_TTL_HOURS,
    OUTBOUND_SEND,
    PARALLEL_CAREER_PACK_STORE,
    PERMISSIONS,
    PUBLIC_PROFILE,
    RECIPIENT_TRACKING,
    SCHEMA_ID,
    SECRET_BYTES,
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _uuid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), default=str, sort_keys=True)


def _digest(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _privacy_paused(db: Session, *, candidate_id: int) -> bool:
    row = (
        db.query(CandidateLifecyclePrivacy)
        .filter(CandidateLifecyclePrivacy.candidate_id == candidate_id)
        .one_or_none()
    )
    return bool(row and row.paused)


def _audit(
    db: Session,
    *,
    candidate_id: int,
    pack_id: int | None,
    action: str,
    payload: dict[str, Any],
) -> None:
    safe = {
        k: v
        for k, v in payload.items()
        if k
        in {
            "state",
            "permission",
            "ttl_hours",
            "count",
            "expired",
            "revoked",
            "pack_unavailable",
            "public_id_prefix",
        }
    }
    db.add(
        CandidateCareerPackAudit(
            candidate_id=candidate_id,
            pack_id=pack_id,
            action=action[:64],
            payload_json=_dumps(safe),
            claim_kind="FACT",
            kpi_excluded=True,
            created_at=_utcnow(),
        )
    )


def catalog() -> dict[str, Any]:
    return {
        "schema_id": SCHEMA_ID,
        "contract_id": CONTRACT_ID,
        "first_value_contract": FIRST_VALUE_CONTRACT,
        "permissions": list(PERMISSIONS),
        "default_ttl_hours": DEFAULT_TTL_HOURS,
        "max_ttl_hours": MAX_TTL_HOURS,
        "max_active_grants_per_candidate": MAX_ACTIVE_GRANTS_PER_CANDIDATE,
        "parallel_career_pack_store": PARALLEL_CAREER_PACK_STORE,
        "outbound_send": OUTBOUND_SEND,
        "recipient_tracking": RECIPIENT_TRACKING,
        "access_analytics": ACCESS_ANALYTICS,
        "email_send": EMAIL_SEND,
        "public_profile": PUBLIC_PROFILE,
        "eighth_primary_nav": EIGHTH_PRIMARY_NAV,
        "first_value_satisfied_by_share_grant": FIRST_VALUE_SATISFIED_BY_SHARE_GRANT,
        "bearer_warning": True,
        "open_tracking": False,
        "drm_claim": False,
        "cookie_name": COOKIE_NAME,
        "cookie_max_age_seconds": COOKIE_MAX_AGE_SECONDS,
    }


def _ser_grant(row: CandidateCareerPackShareGrant) -> dict[str, Any]:
    return {
        "grant_key": row.grant_key,
        "public_id": row.public_id,
        "permission": row.permission,
        "state": row.state,
        "pack_snapshot_hash": row.pack_snapshot_hash,
        "disclosure_hash": row.disclosure_hash,
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "revoked_at": row.revoked_at.isoformat() if row.revoked_at else None,
        "schema_version": row.schema_version,
        "first_value_satisfied": False,
        "kpi_excluded": True,
        "outbound_send": False,
        "recipient_tracking": False,
    }


def _get_pack(db: Session, *, candidate_id: int, pack_key: str) -> CandidateCareerPack:
    row = (
        db.query(CandidateCareerPack)
        .filter(
            CandidateCareerPack.candidate_id == candidate_id,
            CandidateCareerPack.pack_key == pack_key,
            CandidateCareerPack.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        raise LookupError("pack_not_found")
    return row


def _refresh_grant_state(
    db: Session, grant: CandidateCareerPackShareGrant, pack: CandidateCareerPack | None
) -> None:
    if grant.state in {"REVOKED", "DELETED"}:
        return
    if grant.expires_at and grant.expires_at < _utcnow():
        grant.state = "EXPIRED"
        return
    if pack is None or pack.deleted_at is not None or pack.state in {
        "REVOKED",
        "DELETED",
        "EXPIRED",
    }:
        grant.state = "PACK_UNAVAILABLE"
        return
    if not pack.immutable or pack.state != "READY":
        grant.state = "PACK_UNAVAILABLE"
        return
    if pack.snapshot_hash and pack.snapshot_hash != grant.pack_snapshot_hash:
        # Bound to immutable revision — pack mutated somehow → unavailable
        grant.state = "PACK_UNAVAILABLE"


def list_grants(db: Session, *, candidate_id: int, pack_key: str) -> dict[str, Any]:
    pack = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    rows = (
        db.query(CandidateCareerPackShareGrant)
        .filter(
            CandidateCareerPackShareGrant.candidate_id == candidate_id,
            CandidateCareerPackShareGrant.pack_id == pack.id,
            CandidateCareerPackShareGrant.deleted_at.is_(None),
            CandidateCareerPackShareGrant.state != "DELETED",
        )
        .order_by(CandidateCareerPackShareGrant.id.desc())
        .limit(50)
        .all()
    )
    out = []
    for g in rows:
        _refresh_grant_state(db, g, pack)
        out.append(_ser_grant(g))
    db.commit()
    return {
        "schema_id": SCHEMA_ID,
        "pack_key": pack_key,
        "grants": out,
        "first_value_satisfied": False,
        "outbound_send": False,
    }


def create_grant(
    db: Session,
    *,
    candidate_id: int,
    pack_key: str,
    permission: str = "INLINE_VIEW",
    ttl_hours: int = DEFAULT_TTL_HOURS,
    disclosure_hash: str,
    confirm_disclosure: bool = False,
    public_base_url: str = "https://twin-sooty.vercel.app",
) -> dict[str, Any]:
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    if not confirm_disclosure:
        raise ValueError("disclosure_confirmation_required")
    if permission not in PERMISSIONS:
        raise ValueError("invalid_permission")
    ttl = int(ttl_hours)
    if ttl < 1 or ttl > MAX_TTL_HOURS:
        raise ValueError("invalid_ttl")

    pack = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    if pack.state != "READY" or not pack.immutable or not pack.snapshot_hash:
        raise ValueError("pack_not_shareable")
    if pack.expires_at and pack.expires_at < _utcnow():
        raise ValueError("pack_expired")

    # Bind to immutable snapshot — confirmation must match snapshot_hash
    expected = pack.snapshot_hash
    disc = (disclosure_hash or "").strip()
    if disc != expected:
        raise ValueError("disclosure_hash_mismatch")
    bind_hash = expected

    active_count = (
        db.query(CandidateCareerPackShareGrant)
        .filter(
            CandidateCareerPackShareGrant.candidate_id == candidate_id,
            CandidateCareerPackShareGrant.state == "ACTIVE",
            CandidateCareerPackShareGrant.deleted_at.is_(None),
        )
        .count()
    )
    # Expire stale first
    for g in (
        db.query(CandidateCareerPackShareGrant)
        .filter(
            CandidateCareerPackShareGrant.candidate_id == candidate_id,
            CandidateCareerPackShareGrant.state == "ACTIVE",
            CandidateCareerPackShareGrant.deleted_at.is_(None),
        )
        .all()
    ):
        if g.expires_at and g.expires_at < _utcnow():
            g.state = "EXPIRED"
            active_count -= 1
    if active_count >= MAX_ACTIVE_GRANTS_PER_CANDIDATE:
        raise ValueError("max_active_grants")

    expires = _utcnow() + timedelta(hours=ttl)
    if pack.expires_at and expires > pack.expires_at:
        expires = pack.expires_at
    if expires <= _utcnow():
        raise ValueError("expiry_in_past")

    secret = secrets.token_urlsafe(SECRET_BYTES)
    public_id = uuid.uuid4().hex
    grant = CandidateCareerPackShareGrant(
        candidate_id=candidate_id,
        pack_id=pack.id,
        grant_key=_uuid("cps"),
        public_id=public_id,
        secret_digest=_digest(secret),
        permission=permission,
        state="ACTIVE",
        pack_snapshot_hash=bind_hash,
        disclosure_hash=disc or bind_hash,
        schema_version=SCHEMA_ID,
        expires_at=expires,
        claim_kind="FACT",
        kpi_excluded=True,
        first_value_satisfied=False,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(grant)
    _audit(
        db,
        candidate_id=candidate_id,
        pack_id=pack.id,
        action="share_grant_create",
        payload={
            "state": "ACTIVE",
            "permission": permission,
            "ttl_hours": ttl,
            "public_id_prefix": public_id[:8],
        },
    )
    db.commit()
    db.refresh(grant)

    base = public_base_url.rstrip("/")
    full_url = f"{base}/share/career-pack/{public_id}#key={secret}"
    return {
        **_ser_grant(grant),
        "created": True,
        "share_url_once": full_url,
        "secret_shown_once": True,
        "outbound_send": False,
        "first_value_satisfied": False,
        "bearer_warning": (
            "Anyone with this link can open the pack until it expires or you revoke it. "
            "TWIN does not track opens and does not send this link."
        ),
        "drm_claim": False,
    }


def revoke_grant(
    db: Session, *, candidate_id: int, pack_key: str, grant_key: str
) -> dict[str, Any]:
    pack = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    grant = (
        db.query(CandidateCareerPackShareGrant)
        .filter(
            CandidateCareerPackShareGrant.candidate_id == candidate_id,
            CandidateCareerPackShareGrant.pack_id == pack.id,
            CandidateCareerPackShareGrant.grant_key == grant_key,
            CandidateCareerPackShareGrant.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if grant is None:
        raise LookupError("grant_not_found")
    grant.state = "REVOKED"
    grant.revoked_at = _utcnow()
    grant.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        pack_id=pack.id,
        action="share_grant_revoke",
        payload={"state": "REVOKED", "revoked": True, "public_id_prefix": grant.public_id[:8]},
    )
    db.commit()
    return _ser_grant(grant)


def delete_grant(
    db: Session, *, candidate_id: int, pack_key: str, grant_key: str
) -> dict[str, Any]:
    pack = _get_pack(db, candidate_id=candidate_id, pack_key=pack_key)
    grant = (
        db.query(CandidateCareerPackShareGrant)
        .filter(
            CandidateCareerPackShareGrant.candidate_id == candidate_id,
            CandidateCareerPackShareGrant.pack_id == pack.id,
            CandidateCareerPackShareGrant.grant_key == grant_key,
            CandidateCareerPackShareGrant.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if grant is None:
        raise LookupError("grant_not_found")
    grant.state = "DELETED"
    grant.deleted_at = _utcnow()
    grant.secret_digest = _digest(secrets.token_urlsafe(8))  # scrub
    grant.updated_at = _utcnow()
    db.commit()
    return {"deleted": True, "grant_key": grant_key, "first_value_satisfied": False}


def _load_grant_by_public(db: Session, public_id: str) -> CandidateCareerPackShareGrant | None:
    return (
        db.query(CandidateCareerPackShareGrant)
        .filter(
            CandidateCareerPackShareGrant.public_id == public_id,
            CandidateCareerPackShareGrant.deleted_at.is_(None),
        )
        .one_or_none()
    )


def exchange_secret(
    db: Session, *, public_id: str, secret: str
) -> tuple[bool, str | None]:
    """Constant-time digest check. Returns (ok, session_token_or_None). Generic fail."""
    grant = _load_grant_by_public(db, public_id)
    if grant is None:
        # burn time
        hmac.compare_digest(_digest(secret or "x"), _digest("y"))
        return False, None
    pack = db.query(CandidateCareerPack).filter(CandidateCareerPack.id == grant.pack_id).one_or_none()
    _refresh_grant_state(db, grant, pack)
    db.commit()
    if grant.state != "ACTIVE":
        hmac.compare_digest(_digest(secret or "x"), grant.secret_digest)
        return False, None
    ok = hmac.compare_digest(_digest(secret or ""), grant.secret_digest)
    if not ok:
        return False, None
    # Session token = HMAC of public_id + digest prefix (not the raw secret)
    token = hmac.new(
        grant.secret_digest.encode("utf-8"),
        f"{public_id}:{int(_utcnow().timestamp()) // COOKIE_MAX_AGE_SECONDS}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return True, token


def verify_session(db: Session, *, public_id: str, session_token: str) -> CandidateCareerPackShareGrant | None:
    grant = _load_grant_by_public(db, public_id)
    if grant is None or not session_token:
        return None
    pack = db.query(CandidateCareerPack).filter(CandidateCareerPack.id == grant.pack_id).one_or_none()
    _refresh_grant_state(db, grant, pack)
    db.commit()
    if grant.state != "ACTIVE":
        return None
    # Accept current or previous hour bucket (clock skew)
    now_bucket = int(_utcnow().timestamp()) // COOKIE_MAX_AGE_SECONDS
    for bucket in (now_bucket, now_bucket - 1):
        expected = hmac.new(
            grant.secret_digest.encode("utf-8"),
            f"{public_id}:{bucket}".encode(),
            hashlib.sha256,
        ).hexdigest()
        if hmac.compare_digest(session_token, expected):
            return grant
    return None


def recipient_view(
    db: Session, *, public_id: str, session_token: str
) -> dict[str, Any]:
    grant = verify_session(db, public_id=public_id, session_token=session_token)
    if grant is None:
        raise LookupError("unavailable")
    pack = db.query(CandidateCareerPack).filter(CandidateCareerPack.id == grant.pack_id).one_or_none()
    if pack is None or pack.state != "READY" or not pack.immutable:
        raise LookupError("unavailable")
    if pack.snapshot_hash != grant.pack_snapshot_hash:
        raise LookupError("unavailable")
    snapshot = {}
    try:
        snapshot = json.loads(pack.snapshot_json or "{}")
    except json.JSONDecodeError:
        snapshot = {}
    payload = snapshot.get("payload") or {}
    # Recipient-facing: sections only from immutable snapshot — no owner metadata
    return {
        "schema_id": SCHEMA_ID,
        "permission": grant.permission,
        "expires_at": grant.expires_at.isoformat() if grant.expires_at else None,
        "pack_type": pack.pack_type,
        "sections": payload.get("sections") or [],
        "disclosure": payload.get("disclosure") or {},
        "can_download": grant.permission == "INLINE_VIEW_AND_DOWNLOAD",
        "outbound_send": False,
        "recipient_tracking": False,
        "signup_cta": False,
        "owner_apis": False,
        "robots": "noindex,nofollow,noarchive",
    }


def recipient_download(
    db: Session, *, public_id: str, session_token: str, fmt: str = "pdf"
) -> tuple[bytes, str, str]:
    grant = verify_session(db, public_id=public_id, session_token=session_token)
    if grant is None:
        raise LookupError("unavailable")
    if grant.permission != "INLINE_VIEW_AND_DOWNLOAD":
        raise ValueError("download_not_permitted")
    pack = db.query(CandidateCareerPack).filter(CandidateCareerPack.id == grant.pack_id).one_or_none()
    if pack is None or pack.state != "READY":
        raise LookupError("unavailable")
    if fmt == "zip":
        if not pack.zip_bytes:
            raise ValueError("missing")
        return bytes(pack.zip_bytes), f"{public_id}.zip", "application/zip"
    if not pack.pdf_bytes:
        raise ValueError("missing")
    return bytes(pack.pdf_bytes), f"{public_id}.pdf", "application/pdf"


def count_active_grants(db: Session, *, candidate_id: int | None = None) -> int:
    q = db.query(CandidateCareerPackShareGrant).filter(
        CandidateCareerPackShareGrant.state == "ACTIVE",
        CandidateCareerPackShareGrant.deleted_at.is_(None),
    )
    if candidate_id is not None:
        q = q.filter(CandidateCareerPackShareGrant.candidate_id == candidate_id)
    return q.count()


def wipe_all_grants_for_candidate(db: Session, *, candidate_id: int) -> int:
    """Test/cleanup: delete all grants for candidate (synthetic proof teardown)."""
    rows = (
        db.query(CandidateCareerPackShareGrant)
        .filter(CandidateCareerPackShareGrant.candidate_id == candidate_id)
        .all()
    )
    n = 0
    for g in rows:
        g.state = "DELETED"
        g.deleted_at = _utcnow()
        g.secret_digest = _digest(secrets.token_urlsafe(8))
        n += 1
    db.commit()
    return n
