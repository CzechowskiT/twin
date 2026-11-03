"""Founder-controlled real canary candidate designation (close NOT_DESIGNATED).

Never activates canary, never mints/sends invites, never raises caps.
Persists encrypted delivery identity; APIs return masked fields only.
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import RealCanaryCandidateDesignation
from app.services.candidate_invite_tokens import encrypt_email, hash_email, mask_email
from app.services.token_crypto import decrypt_secret

SCHEMA = "twin.real_canary_candidate_designation/v1"
GATE_NAME = "REAL_CANARY_CANDIDATE_DESIGNATED_READY"

STATUS_DESIGNATED_READY = "DESIGNATED_READY"
STATUS_REVOKED = "REVOKED"
STATUS_INVALID = "INVALID"
STATUS_DELETED = "DELETED"

CHANNEL_EMAIL = "email"
ALLOWED_CHANNELS = frozenset({CHANNEL_EMAIL})

# Fail-closed fixture / synth domains — never accept as REAL designation.
BLOCKED_DOMAINS = frozenset(
    {
        "example.com",
        "example.org",
        "example.net",
        "twin.internal",
        "localhost",
        "local.test",
        "test",
        "invalid",  # reserved TLD alone blocked as domain label misuse
        "mailinator.com",
        "guerrillamail.com",
        "tempmail.com",
    }
)
# Reserved non-routable TLD allowed only for infra E2E probes (teardown to 0).
_ALLOWED_PROBE_SUFFIX = ".invalid"


_EMAIL_RE = re.compile(r"^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$")


def _utcnow() -> datetime:
    return datetime.utcnow()


def _dumps(obj: Any) -> str:
    return json.dumps(obj, separators=(",", ":"), default=str)


def _loads(raw: str | None, default: Any) -> Any:
    try:
        return json.loads(raw or "") if raw else default
    except Exception:
        return default


def _append_audit(row: RealCanaryCandidateDesignation, event: str, detail: dict[str, Any]) -> None:
    audit = _loads(row.audit_json, [])
    if not isinstance(audit, list):
        audit = []
    # Content-free only — never identity plaintext
    safe = {k: v for k, v in detail.items() if k not in {"email", "identity", "plaintext", "token"}}
    audit.append({"event": event, "at": _utcnow().isoformat(), **safe})
    row.audit_json = _dumps(audit[-60:])


def normalize_identity(raw: str, *, channel: str) -> str:
    ch = (channel or "").strip().lower()
    if ch != CHANNEL_EMAIL:
        raise ValueError("unsupported_delivery_channel")
    email = (raw or "").strip().lower()
    if not email:
        raise ValueError("blank_delivery_identity")
    if not _EMAIL_RE.match(email):
        raise ValueError("invalid_email_syntax")
    domain = email.rsplit("@", 1)[-1]
    if domain.endswith(_ALLOWED_PROBE_SUFFIX) and domain != "invalid":
        pass  # reserved non-routable probe host — not a real person; E2E teardown required
    elif domain in BLOCKED_DOMAINS or any(
        domain == d or domain.endswith("." + d) for d in BLOCKED_DOMAINS
    ):
        raise ValueError("fixture_or_blocked_domain")
    if "+synth" in email or email.startswith("synth.") or ".synth@" in email:
        raise ValueError("synthetic_identity_rejected")
    return email


def active_designations(db: Session) -> list[RealCanaryCandidateDesignation]:
    return (
        db.query(RealCanaryCandidateDesignation)
        .filter(
            RealCanaryCandidateDesignation.status == STATUS_DESIGNATED_READY,
            RealCanaryCandidateDesignation.deleted_at.is_(None),
            RealCanaryCandidateDesignation.is_synthetic.is_(False),
            RealCanaryCandidateDesignation.lane == "REAL",
        )
        .order_by(RealCanaryCandidateDesignation.id.asc())
        .all()
    )


def designation_status(db: Session | None = None) -> dict[str, Any]:
    """Public/admin-safe status — never includes ciphertext or plaintext."""
    if db is None:
        return {
            "schema": SCHEMA,
            "gate_name": GATE_NAME,
            "gate_ready": False,
            "status": "NOT_DESIGNATED",
            "active_count": 0,
            "ambiguous": False,
            "designation_id": None,
            "delivery_identity_masked": None,
            "delivery_channel": None,
            "secure_roster_reference": None,
            "activation_consumes_designation_id": True,
            "never_raises_caps": True,
            "never_sends_invite": True,
            "claim_kind": "FACT",
            "kpi_excluded": True,
        }
    rows = active_designations(db)
    n = len(rows)
    if n == 0:
        status = "NOT_DESIGNATED"
        gate = False
        amb = False
        row = None
    elif n == 1:
        status = STATUS_DESIGNATED_READY
        gate = True
        amb = False
        row = rows[0]
    else:
        status = "AMBIGUOUS"
        gate = False
        amb = True
        row = None
    return {
        "schema": SCHEMA,
        "gate_name": GATE_NAME,
        "gate_ready": gate,
        "status": status,
        "active_count": n,
        "ambiguous": amb,
        "designation_id": row.designation_id if row else None,
        "delivery_identity_masked": row.delivery_identity_masked if row else None,
        "delivery_channel": row.delivery_channel if row else None,
        "secure_roster_reference": row.secure_roster_reference if row else None,
        "designated_at": row.designated_at.isoformat() if row and row.designated_at else None,
        "ladder": {
            "product_ready": True,
            "candidate_designated": gate,
            "activation_executed": False,
            "invite_created": False,
            "canary_active": False,
        },
        "activation_consumes_designation_id": True,
        "never_raises_caps": True,
        "never_sends_invite": True,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def designate(
    db: Session,
    *,
    delivery_identity: str,
    delivery_channel: str = CHANNEL_EMAIL,
    secure_roster_reference: str | None = None,
    actor: str = "ops_admin",
    replace_existing: bool = True,
) -> dict[str, Any]:
    """Create exactly one DESIGNATED_READY row. Does not activate/invite/cap."""
    channel = (delivery_channel or CHANNEL_EMAIL).strip().lower()
    if channel not in ALLOWED_CHANNELS:
        raise ValueError("unsupported_delivery_channel")
    email = normalize_identity(delivery_identity, channel=channel)
    active = active_designations(db)
    if len(active) > 1:
        raise ValueError("REAL_CANARY_CANDIDATE_AMBIGUOUS")
    if len(active) == 1 and not replace_existing:
        raise ValueError("active_designation_exists")
    if len(active) == 1 and replace_existing:
        prev = active[0]
        prev.status = STATUS_REVOKED
        prev.revoked_at = _utcnow()
        prev.updated_at = _utcnow()
        _append_audit(prev, "replaced", {"by_actor": (actor or "ops_admin")[:64]})

    did = f"des_{uuid.uuid4().hex[:20]}"
    row = RealCanaryCandidateDesignation(
        designation_id=did,
        status=STATUS_DESIGNATED_READY,
        delivery_channel=channel,
        delivery_identity_ciphertext=encrypt_email(email),
        delivery_identity_hash=hash_email(email),
        delivery_identity_masked=mask_email(email),
        secure_roster_reference=(secure_roster_reference or "").strip()[:128] or None,
        designated_by_actor=(actor or "ops_admin")[:64],
        audit_json=_dumps([]),
        lane="REAL",
        is_synthetic=False,
        kpi_excluded=True,
        claim_kind="FACT",
        designated_at=_utcnow(),
        created_at=_utcnow(),
    )
    _append_audit(
        row,
        "designated",
        {
            "channel": channel,
            "has_roster_ref": bool(row.secure_roster_reference),
            "actor": row.designated_by_actor,
        },
    )
    db.add(row)
    db.commit()
    # Re-check singleton invariant
    if len(active_designations(db)) > 1:
        row.status = STATUS_INVALID
        row.updated_at = _utcnow()
        _append_audit(row, "invalidated", {"reason": "ambiguous_after_commit"})
        db.commit()
        raise ValueError("REAL_CANARY_CANDIDATE_AMBIGUOUS")
    return designation_status(db)


def revoke(db: Session, *, designation_id: str | None = None, actor: str = "ops_admin") -> dict[str, Any]:
    rows = active_designations(db)
    if designation_id:
        rows = [r for r in rows if r.designation_id == designation_id] or (
            db.query(RealCanaryCandidateDesignation)
            .filter(RealCanaryCandidateDesignation.designation_id == designation_id)
            .all()
        )
    if not rows:
        return designation_status(db)
    for row in rows:
        if row.status == STATUS_DESIGNATED_READY:
            row.status = STATUS_REVOKED
            row.revoked_at = _utcnow()
            row.updated_at = _utcnow()
            _append_audit(row, "revoked", {"by_actor": (actor or "ops_admin")[:64]})
    db.commit()
    return designation_status(db)


def activation_preflight(db: Session) -> dict[str, Any]:
    """Preconditions for a future Founder activation — does NOT execute activation.

    Returns secure designation_id for delivery boundary; never plaintext identity.
    """
    st = designation_status(db)
    blockers: list[str] = []
    if st["ambiguous"]:
        blockers.append("REAL_CANARY_CANDIDATE_AMBIGUOUS")
    if st["active_count"] == 0:
        blockers.append("REAL_CANARY_CANDIDATE_NOT_DESIGNATED")
    if st["active_count"] != 1:
        blockers.append("designation_count_not_exactly_one")
    ok = not blockers and bool(st.get("gate_ready"))
    return {
        "schema": "twin.canary_activation_preflight/v1",
        "ready_for_founder_activation": ok,
        "blockers": blockers,
        "consumes_designation_id": st.get("designation_id"),
        "technical_gate_separate": "ONE_CANDIDATE_CANARY_READY",
        "designation_gate": GATE_NAME,
        "designation_gate_ready": bool(st.get("gate_ready")),
        "mutates_state": False,
        "activates": False,
        "generates_invites": False,
        "sends_invites": False,
        "raises_caps": False,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def decrypt_for_delivery_boundary(db: Session, *, designation_id: str) -> str | None:
    """Decrypt only at future invite delivery boundary — not for admin GET/report."""
    row = (
        db.query(RealCanaryCandidateDesignation)
        .filter(
            RealCanaryCandidateDesignation.designation_id == designation_id,
            RealCanaryCandidateDesignation.status == STATUS_DESIGNATED_READY,
            RealCanaryCandidateDesignation.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        return None
    try:
        return decrypt_secret(row.delivery_identity_ciphertext).strip().lower()
    except Exception:
        return None
