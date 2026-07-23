"""Controlled Pilot Operating System — status, gates, KPI honesty.

Does not invent customers. Invitation packs stay UNSENT without
FOUNDER_APPROVED org + explicit send approval. Launch GO stays NO-GO
until real pilot evidence criteria are met.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import (
    PilotInvitationPack,
    PilotOrganization,
    PilotSupportTicket,
)
from app.services.pilot_stance import (
    PILOT_READY,
    resolve_pilot_stance,
    temporary_pilot_canonical_url,
)

APPROVAL_CANDIDATE = "CANDIDATE"
APPROVAL_FOUNDER_APPROVED = "FOUNDER_APPROVED"
APPROVAL_REJECTED = "REJECTED"
APPROVAL_WITHDRAWN = "WITHDRAWN"

PACK_DRAFT = "DRAFT"
PACK_READY_UNSENT = "READY_UNSENT"
PACK_SENT = "SENT"
PACK_REVOKED = "REVOKED"

KPI_NO_REAL = "NO_REAL_PILOT_DATA"
KPI_PARTIAL = "PARTIAL_REAL_PILOT_DATA"
KPI_SUFFICIENT = "SUFFICIENT_REAL_PILOT_DATA"

OS_AWAITING_ORG = (
    "CONTROLLED PILOT OPERATING SYSTEM READY — "
    "AWAITING FIRST FOUNDER-APPROVED PILOT ORGANIZATION"
)
OS_ACTIVE = "CONTROLLED PILOT ACTIVE — FIRST REAL USERS ONBOARDED"

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$")
_SYNTHETIC_SLUGS = frozenset({"nova-hiring-pl", "demo-company", "twin-demo"})


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _mask_email(email: str) -> str:
    e = (email or "").strip()
    if "@" not in e:
        return "***"
    local, domain = e.split("@", 1)
    return f"{local[:2]}***@{domain}" if local else f"***@{domain}"


def _parse_emails(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(x).strip().lower() for x in data if str(x).strip()]
    except json.JSONDecodeError:
        pass
    return [x.strip().lower() for x in raw.split(",") if x.strip()]


def org_to_dict(org: PilotOrganization, *, mask: bool = True) -> dict[str, Any]:
    emails = _parse_emails(org.recipient_emails_json)
    return {
        "id": org.id,
        "slug": org.slug,
        "display_name": org.display_name,
        "market": org.market,
        "approval_status": org.approval_status,
        "is_synthetic": bool(org.is_synthetic),
        "recipient_count": len(emails),
        "recipients_masked": [_mask_email(e) for e in emails] if mask else emails,
        "cohort_id": org.cohort_id,
        "tenant_id": org.tenant_id,
        "approved_at": org.approved_at.isoformat() + "Z" if org.approved_at else None,
        "approved_by_label": org.approved_by_label,
        "notes": org.notes,
        "created_at": org.created_at.isoformat() + "Z" if org.created_at else None,
    }


def pack_to_dict(pack: PilotInvitationPack) -> dict[str, Any]:
    emails = _parse_emails(pack.recipients_json)
    return {
        "id": pack.id,
        "organization_id": pack.organization_id,
        "status": pack.status,
        "recipient_count": len(emails),
        "recipients_masked": [_mask_email(e) for e in emails],
        "template_key": pack.template_key,
        "prepared_at": pack.prepared_at.isoformat() + "Z" if pack.prepared_at else None,
        "sent_at": pack.sent_at.isoformat() + "Z" if pack.sent_at else None,
        "founder_send_approval_ref": pack.founder_send_approval_ref,
        "notes": pack.notes,
    }


def list_organizations(db: Session, *, include_synthetic: bool = True) -> list[dict[str, Any]]:
    q = db.query(PilotOrganization).order_by(PilotOrganization.id.asc())
    if not include_synthetic:
        q = q.filter(PilotOrganization.is_synthetic.is_(False))
    return [org_to_dict(o) for o in q.all()]


def create_organization_candidate(
    db: Session,
    *,
    slug: str,
    display_name: str,
    market: str = "PL",
    recipient_emails: list[str] | None = None,
    notes: str | None = None,
    is_synthetic: bool = False,
) -> PilotOrganization:
    slug_n = slug.strip().lower()
    if not _SLUG_RE.match(slug_n):
        raise ValueError("invalid_slug")
    if slug_n in _SYNTHETIC_SLUGS:
        is_synthetic = True
    existing = db.query(PilotOrganization).filter(PilotOrganization.slug == slug_n).one_or_none()
    if existing:
        raise ValueError("slug_exists")
    org = PilotOrganization(
        slug=slug_n,
        display_name=display_name.strip()[:200],
        market=(market or "PL")[:64],
        approval_status=APPROVAL_CANDIDATE,
        is_synthetic=is_synthetic,
        recipient_emails_json=json.dumps(
            [e.strip().lower() for e in (recipient_emails or []) if e.strip()]
        ),
        notes=notes,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def founder_approve_organization(
    db: Session,
    *,
    org_id: int,
    approved_by_label: str,
    recipient_emails: list[str] | None = None,
    notes: str | None = None,
) -> PilotOrganization:
    org = db.query(PilotOrganization).filter(PilotOrganization.id == org_id).one_or_none()
    if org is None:
        raise ValueError("org_not_found")
    if org.is_synthetic:
        raise ValueError("synthetic_org_cannot_be_founder_approved_for_real_pilot")
    emails = recipient_emails if recipient_emails is not None else _parse_emails(org.recipient_emails_json)
    if len(emails) < 1:
        raise ValueError("recipients_required")
    org.approval_status = APPROVAL_FOUNDER_APPROVED
    org.approved_at = _utcnow()
    org.approved_by_label = (approved_by_label or "Founder")[:120]
    org.recipient_emails_json = json.dumps([e.strip().lower() for e in emails if e.strip()])
    if notes:
        org.notes = notes
    org.updated_at = _utcnow()
    db.commit()
    db.refresh(org)
    return org


def prepare_invitation_pack(
    db: Session,
    *,
    org_id: int,
    notes: str | None = None,
) -> PilotInvitationPack:
    org = db.query(PilotOrganization).filter(PilotOrganization.id == org_id).one_or_none()
    if org is None:
        raise ValueError("org_not_found")
    if org.approval_status != APPROVAL_FOUNDER_APPROVED:
        raise ValueError("org_not_founder_approved")
    if org.is_synthetic:
        raise ValueError("synthetic_org_blocked")
    emails = _parse_emails(org.recipient_emails_json)
    if not emails:
        raise ValueError("recipients_required")
    pack = PilotInvitationPack(
        organization_id=org.id,
        status=PACK_READY_UNSENT,
        recipients_json=json.dumps(emails),
        prepared_at=_utcnow(),
        notes=notes or "Prepared — awaiting Founder send approval (not sent)",
    )
    db.add(pack)
    db.commit()
    db.refresh(pack)
    return pack


def send_invitation_pack(
    db: Session,
    *,
    pack_id: int,
    founder_send_approval_ref: str,
) -> PilotInvitationPack:
    """Mark pack SENT only with explicit Founder approval ref — no silent mass send."""
    pack = db.query(PilotInvitationPack).filter(PilotInvitationPack.id == pack_id).one_or_none()
    if pack is None:
        raise ValueError("pack_not_found")
    if pack.status != PACK_READY_UNSENT:
        raise ValueError("pack_not_ready_unsent")
    ref = (founder_send_approval_ref or "").strip()
    if len(ref) < 8:
        raise ValueError("founder_send_approval_ref_required")
    org = (
        db.query(PilotOrganization)
        .filter(PilotOrganization.id == pack.organization_id)
        .one_or_none()
    )
    if org is None or org.approval_status != APPROVAL_FOUNDER_APPROVED or org.is_synthetic:
        raise ValueError("org_gate_failed")
    # Enqueue drafts only — workers may send; we record SENT after approval.
    from app.services.platform_foundations import enqueue_communication_draft

    for email in _parse_emails(pack.recipients_json):
        enqueue_communication_draft(
            db,
            template_key=pack.template_key,
            recipient_email=email,
            payload={
                "pilot_org_id": org.id,
                "pack_id": pack.id,
                "to_masked": _mask_email(email),
            },
            dedupe_key=f"pilot-invite-{pack.id}-{email}",
        )
    pack.status = PACK_SENT
    pack.sent_at = _utcnow()
    pack.founder_send_approval_ref = ref[:128]
    pack.updated_at = _utcnow()
    db.commit()
    db.refresh(pack)
    return pack


def open_support_ticket(
    db: Session,
    *,
    subject: str,
    category: str = "general",
    severity: str = "normal",
    body_summary: str | None = None,
    organization_id: int | None = None,
) -> PilotSupportTicket:
    ticket = PilotSupportTicket(
        organization_id=organization_id,
        category=(category or "general")[:64],
        status="open",
        subject=(subject or "pilot support")[:200],
        body_summary=(body_summary or "")[:2000] or None,
        severity=(severity or "normal")[:16],
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def evaluate_launch_go_gate(
    db: Session,
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Machine-readable Launch GO gate — requires real pilot evidence; default FAIL."""
    s = settings or get_settings()
    approved = (
        db.query(PilotOrganization)
        .filter(
            PilotOrganization.approval_status == APPROVAL_FOUNDER_APPROVED,
            PilotOrganization.is_synthetic.is_(False),
        )
        .count()
    )
    sent_packs = (
        db.query(PilotInvitationPack)
        .filter(PilotInvitationPack.status == PACK_SENT)
        .count()
    )
    real_recipients = 0
    for org in (
        db.query(PilotOrganization)
        .filter(
            PilotOrganization.approval_status == APPROVAL_FOUNDER_APPROVED,
            PilotOrganization.is_synthetic.is_(False),
        )
        .all()
    ):
        real_recipients += len(_parse_emails(org.recipient_emails_json))

    criteria = {
        "pilot_stance_ready": resolve_pilot_stance(s) == PILOT_READY,
        "gate_f_pass": True,  # product Gate F PASS (frozen)
        "launch_currently_no_go": True,
        "enrollment_off": not bool(s.external_pilot_enrollment_enabled),
        "phase_3b_blocked": True,
        "founder_approved_real_org_count_ge_1": approved >= 1,
        "invitation_pack_sent_ge_1": sent_packs >= 1,
        "named_real_recipients_ge_3": real_recipients >= 3,
        "kpi_not_no_real_pilot_data": False,  # flipped only after real evidence below
        "no_fake_customer_claims": True,
        "stripe_public_not_live": True,
        "public_registration_off": bool(s.pilot_registration_invite_only)
        or not bool(s.external_pilot_enrollment_enabled),
    }
    # KPI honesty
    kpi = KPI_NO_REAL
    if approved >= 1 and sent_packs >= 1 and real_recipients >= 1:
        kpi = KPI_PARTIAL
    if approved >= 1 and sent_packs >= 1 and real_recipients >= 3:
        kpi = KPI_SUFFICIENT
        criteria["kpi_not_no_real_pilot_data"] = True

    required_for_go = [
        "founder_approved_real_org_count_ge_1",
        "invitation_pack_sent_ge_1",
        "named_real_recipients_ge_3",
        "kpi_not_no_real_pilot_data",
        "enrollment_off",  # Launch GO ≠ mass enrollment ON; separate axis
        "no_fake_customer_claims",
    ]
    missing = [k for k in required_for_go if not criteria.get(k)]
    # Explicit: Launch GO still requires Founder business decision beyond evidence.
    decision = "NO-GO"
    reason = "insufficient_real_pilot_evidence" if missing else "evidence_ready_awaiting_founder_launch_decision"
    if missing:
        reason = "insufficient_real_pilot_evidence:" + ",".join(missing)

    return {
        "launch_decision": decision,
        "reason": reason,
        "criteria": criteria,
        "missing_for_evidence_ready": missing,
        "kpi_token": kpi,
        "counts": {
            "founder_approved_real_orgs": approved,
            "invitation_packs_sent": sent_packs,
            "named_real_recipients": real_recipients,
        },
        "hard_bans": {
            "launch": "NO-GO",
            "enrollment": "OFF",
            "phase_3b": "BLOCKED",
            "stripe_public": "NOT_LIVE",
            "public_registration": "INVITE_ONLY_OR_OFF",
        },
    }


def build_os_status(db: Session, settings: Settings | None = None) -> dict[str, Any]:
    s = settings or get_settings()
    orgs = list_organizations(db, include_synthetic=True)
    real_approved = [
        o
        for o in orgs
        if o["approval_status"] == APPROVAL_FOUNDER_APPROVED and not o["is_synthetic"]
    ]
    packs = [pack_to_dict(p) for p in db.query(PilotInvitationPack).order_by(PilotInvitationPack.id).all()]
    open_tickets = (
        db.query(PilotSupportTicket).filter(PilotSupportTicket.status == "open").count()
    )
    launch_gate = evaluate_launch_go_gate(db, s)
    sent_real = any(p["status"] == PACK_SENT for p in packs) and len(real_approved) >= 1

    if sent_real and launch_gate["counts"]["named_real_recipients"] >= 1:
        verdict = OS_ACTIVE
    else:
        verdict = OS_AWAITING_ORG

    return {
        "schema": "twin.controlled_pilot_os/v1",
        "generated_at": _utcnow().isoformat() + "Z",
        "verdict": verdict,
        "stance": {
            "pilot": resolve_pilot_stance(s),
            "gate_f": "PASS",
            "launch": "NO-GO",
            "enrollment": "OFF",
            "phase_3b": "BLOCKED",
            "external_pilot_enrollment_enabled": bool(s.external_pilot_enrollment_enabled),
            "pilot_registration_invite_only": bool(s.pilot_registration_invite_only),
        },
        "canonical_url": temporary_pilot_canonical_url(s),
        "kpi_token": launch_gate["kpi_token"],
        "organizations": orgs,
        "founder_approved_real_orgs": real_approved,
        "invitation_packs": packs,
        "support_open_tickets": open_tickets,
        "launch_go_gate": launch_gate,
        "next_founder_action": (
            "Select and FOUNDER_APPROVE first real pilot organization with named recipients "
            "(CLI: POST /api/v1/admin/pilot-os/organizations/{id}/approve). "
            "Do not invent customers. Synthetic nova-hiring-pl is not a real pilot org."
            if not real_approved
            else (
                "Prepare invitation pack then send only with founder_send_approval_ref "
                "(POST .../invitation-packs/{id}/send)."
                if not sent_real
                else "Monitor first-week playbook; Launch remains NO-GO until separate Founder decision."
            )
        ),
        "docs": {
            "os_index": "docs/CONTROLLED_PILOT_OPERATING_SYSTEM.md",
            "manifest": "docs/CONTROLLED_PILOT_OS_MANIFEST.json",
            "launch_go_gate": "docs/LAUNCH_GO_EVIDENCE_GATE.json",
            "dns": "docs/RC1_DOMAIN_DNS_FOUNDER_ACTION.md",
        },
    }


def load_os_manifest() -> dict[str, Any]:
    root = Path(__file__).resolve().parents[3]
    path = root / "docs" / "CONTROLLED_PILOT_OS_MANIFEST.json"
    if not path.exists():
        return {"schema": "twin.controlled_pilot_os.manifest/v1", "missing": True}
    return json.loads(path.read_text(encoding="utf-8"))
