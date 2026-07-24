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

# Customer-usable ≠ Hard LIVE CORE technical pass (143).
CUSTOMER_USABLE_VERDICT_COMPLETE = (
    "CUSTOMER-USABLE MULTI-ROLE PILOT JOURNEY COMPLETE — READY FOR FIRST APPROVED ORGANIZATION"
)
CUSTOMER_USABLE_VERDICT_INCOMPLETE = (
    "CUSTOMER-USABLE MULTI-ROLE PILOT JOURNEY INCOMPLETE — EXACT BLOCKERS"
)
HARD_LIVE_CORE_PASS_TECHNICAL = 143
CUSTOMER_USABLE_PASS_COUNT = 11
CUSTOMER_USABLE_MINIMAL_JOURNEY_ID = "recruiter_inbox_accept_decline"
CUSTOMER_USABLE_MULTI_ROLE_JOURNEY_ID = "company_recruiter_candidate_pipeline"
KPI_PARTIAL = "PARTIAL_REAL_PILOT_DATA"
KPI_SUFFICIENT = "SUFFICIENT_REAL_PILOT_DATA"

OS_AWAITING_ORG = (
    "CONTROLLED PILOT OPERATING SYSTEM READY — "
    "AWAITING FIRST FOUNDER-APPROVED PILOT ORGANIZATION"
)
OS_ACTIVE = "CONTROLLED PILOT ACTIVE — FIRST REAL USERS ONBOARDED"

# First real pilot organization activation outcomes (evidence-gated; never invent orgs).
ACTIVATION_APPROVAL_REQUIRED = (
    "FIRST REAL PILOT ORGANIZATION APPROVAL REQUIRED — ACTIVATION SYSTEM READY"
)
ACTIVATION_APPROVED_PACK_UNSENT = (
    "FIRST REAL PILOT ORGANIZATION APPROVED — ACTIVATION PACK READY AND UNSENT"
)
ACTIVATION_INVITES_SENT_AWAITING = (
    "FIRST REAL PILOT ORGANIZATION INVITATIONS SENT — AWAITING USER ACTIVATION"
)
ACTIVATION_ACTIVE = "FIRST REAL PILOT ORGANIZATION ACTIVATED — CONTROLLED PILOT ACTIVE"
ACTIVATION_BLOCKED_REGRESSION = (
    "FIRST REAL PILOT ORGANIZATION ACTIVATION BLOCKED — CUSTOMER-USABLE JOURNEY REGRESSION"
)

INTAKE_REQUIRED_FIELDS = (
    "slug",
    "display_name",
    "legal_name",
    "sponsor_label",
    "approved_by_label",
    "founder_org_approval_ref",
    "recipient_emails",
)

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
        "legal_name": getattr(org, "legal_name", None),
        "sponsor_label": getattr(org, "sponsor_label", None),
        "founder_org_approval_ref": getattr(org, "founder_org_approval_ref", None),
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
    legal_name: str | None = None,
    sponsor_label: str | None = None,
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
        legal_name=(legal_name or "").strip()[:200] or None,
        sponsor_label=(sponsor_label or "").strip()[:120] or None,
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
    founder_org_approval_ref: str | None = None,
    legal_name: str | None = None,
    sponsor_label: str | None = None,
) -> PilotOrganization:
    org = db.query(PilotOrganization).filter(PilotOrganization.id == org_id).one_or_none()
    if org is None:
        raise ValueError("org_not_found")
    if org.is_synthetic:
        raise ValueError("synthetic_org_cannot_be_founder_approved_for_real_pilot")
    emails = recipient_emails if recipient_emails is not None else _parse_emails(org.recipient_emails_json)
    if len(emails) < 1:
        raise ValueError("recipients_required")
    ref = (founder_org_approval_ref or org.founder_org_approval_ref or "").strip()
    if len(ref) < 8:
        raise ValueError("founder_org_approval_ref_required")
    sponsor = (sponsor_label or org.sponsor_label or "").strip()
    if len(sponsor) < 2:
        raise ValueError("sponsor_label_required")
    legal = (legal_name or org.legal_name or org.display_name or "").strip()
    if len(legal) < 2:
        raise ValueError("legal_name_required")
    org.approval_status = APPROVAL_FOUNDER_APPROVED
    org.approved_at = _utcnow()
    org.approved_by_label = (approved_by_label or "Founder")[:120]
    org.founder_org_approval_ref = ref[:128]
    org.sponsor_label = sponsor[:120]
    org.legal_name = legal[:200]
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
    try:
        from app.services.product_funnel import emit_funnel_event

        emit_funnel_event(
            db,
            event_name="pilot_invite_pack_prepared",
            user_id=None,
            persona="ops",
            properties={"org_id": org.id, "pack_id": pack.id},
        )
        db.commit()
    except Exception:
        pass
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


FC_READY = "FIRST CUSTOMER READY — WAITING FOR FIRST APPROVED PILOT ORGANIZATION"
FC_ONBOARDED = "FIRST CUSTOMER ONBOARDED — CONTROLLED PILOT ACTIVE"


def open_support_ticket(
    db: Session,
    *,
    subject: str,
    category: str = "general",
    severity: str = "normal",
    body_summary: str | None = None,
    organization_id: int | None = None,
    assigned_to_label: str | None = None,
    sla_hours: int = 24,
) -> PilotSupportTicket:
    from datetime import timedelta

    due = _utcnow() + timedelta(hours=max(1, min(sla_hours, 168)))
    audit = json.dumps([{"at": _utcnow().isoformat() + "Z", "action": "opened"}])
    ticket = PilotSupportTicket(
        organization_id=organization_id,
        category=(category or "general")[:64],
        status="open",
        subject=(subject or "pilot support")[:200],
        body_summary=(body_summary or "")[:2000] or None,
        severity=(severity or "normal")[:16],
        assigned_to_label=(assigned_to_label or None),
        sla_hours=max(1, min(int(sla_hours or 24), 168)),
        sla_due_at=due,
        audit_json=audit,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def ticket_to_dict(ticket: PilotSupportTicket) -> dict[str, Any]:
    return {
        "id": ticket.id,
        "organization_id": ticket.organization_id,
        "category": ticket.category,
        "status": ticket.status,
        "subject": ticket.subject,
        "severity": ticket.severity,
        "assigned_to_label": ticket.assigned_to_label,
        "sla_hours": ticket.sla_hours,
        "sla_due_at": ticket.sla_due_at.isoformat() + "Z" if ticket.sla_due_at else None,
        "resolution_notes": ticket.resolution_notes,
        "created_at": ticket.created_at.isoformat() + "Z" if ticket.created_at else None,
        "resolved_at": ticket.resolved_at.isoformat() + "Z" if ticket.resolved_at else None,
    }


def list_support_tickets(
    db: Session, *, status: str | None = "open", limit: int = 50
) -> list[dict[str, Any]]:
    q = db.query(PilotSupportTicket).order_by(PilotSupportTicket.id.desc())
    if status:
        q = q.filter(PilotSupportTicket.status == status)
    return [ticket_to_dict(t) for t in q.limit(max(1, min(limit, 200))).all()]


def resolve_support_ticket(
    db: Session,
    *,
    ticket_id: int,
    resolution_notes: str | None = None,
    assigned_to_label: str | None = None,
) -> PilotSupportTicket:
    ticket = db.query(PilotSupportTicket).filter(PilotSupportTicket.id == ticket_id).one_or_none()
    if ticket is None:
        raise ValueError("ticket_not_found")
    ticket.status = "resolved"
    ticket.resolved_at = _utcnow()
    if resolution_notes:
        ticket.resolution_notes = resolution_notes[:4000]
    if assigned_to_label:
        ticket.assigned_to_label = assigned_to_label[:120]
    events = []
    try:
        events = json.loads(ticket.audit_json or "[]")
        if not isinstance(events, list):
            events = []
    except json.JSONDecodeError:
        events = []
    events.append({"at": _utcnow().isoformat() + "Z", "action": "resolved"})
    ticket.audit_json = json.dumps(events)[:8000]
    ticket.updated_at = _utcnow()
    db.commit()
    db.refresh(ticket)
    return ticket


def compute_first_customer_scores(
    db: Session,
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Pilot health + Launch GO readiness — honest zeros without real org."""
    gate = evaluate_launch_go_gate(db, settings)
    approved = gate["counts"]["founder_approved_real_orgs"]
    sent = gate["counts"]["invitation_packs_sent"]
    open_t = db.query(PilotSupportTicket).filter(PilotSupportTicket.status == "open").count()
    from app.database.models import ProductFeedback

    open_fb = db.query(ProductFeedback).filter(ProductFeedback.status == "open").count()

    # Launch GO readiness score: 0–100; without real evidence stays 0–15 (ops only)
    launch_score = 0
    if gate["criteria"].get("pilot_stance_ready"):
        launch_score += 5
    if gate["criteria"].get("gate_f_pass"):
        launch_score += 5
    if gate["criteria"].get("enrollment_off"):
        launch_score += 5
    if approved >= 1:
        launch_score += 25
    if sent >= 1:
        launch_score += 25
    if gate["counts"]["named_real_recipients"] >= 3:
        launch_score += 20
    if gate["kpi_token"] != KPI_NO_REAL:
        launch_score += 15
    launch_score = min(100, launch_score)
    # Hard: Launch decision remains NO-GO regardless of score until Founder flip
    launch_ready = False

    pilot_health = 80  # OS ready base
    if approved >= 1:
        pilot_health = 88
    if approved >= 1 and sent >= 1:
        pilot_health = 92
    if open_t > 5:
        pilot_health = max(50, pilot_health - 10)
    if open_fb > 20:
        pilot_health = max(50, pilot_health - 5)

    if approved >= 1 and sent >= 1:
        fc_verdict = FC_ONBOARDED
    else:
        fc_verdict = FC_READY

    return {
        "first_customer_verdict": fc_verdict,
        "pilot_health_score": pilot_health,
        "launch_go_readiness_score": launch_score,
        "launch_go_ready": launch_ready,
        "launch_decision": "NO-GO",
        "open_support_tickets": open_t,
        "open_feedback_items": open_fb,
        "kpi_token": gate["kpi_token"],
        "checklists_doc": "docs/FIRST_CUSTOMER_SUCCESS_CHECKLISTS.md",
    }


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


def evaluate_send_safety_gate(
    db: Session,
    settings: Settings | None = None,
    *,
    pack_id: int,
    founder_send_approval_ref: str | None = None,
) -> dict[str, Any]:
    """Pre-send checklist — never auto-approves send.

    ``allowed`` is True only when pack/org gates pass AND an explicit
    ``founder_send_approval_ref`` (≥8) is supplied at evaluation time.
    """
    _ = settings  # reserved for future enrollment / provider checks
    pack = db.query(PilotInvitationPack).filter(PilotInvitationPack.id == pack_id).one_or_none()
    if pack is None:
        return {
            "ok": False,
            "allowed": False,
            "can_send": False,
            "blockers": ["pack_not_found"],
            "requires_founder_send_approval_ref": True,
            "min_ref_length": 8,
        }
    org = (
        db.query(PilotOrganization)
        .filter(PilotOrganization.id == pack.organization_id)
        .one_or_none()
    )
    blockers: list[str] = []
    if pack.status != PACK_READY_UNSENT:
        blockers.append("pack_not_ready_unsent")
    if org is None:
        blockers.append("org_not_found")
    else:
        if org.is_synthetic:
            blockers.append("synthetic_org_blocked")
        if org.approval_status != APPROVAL_FOUNDER_APPROVED:
            blockers.append("org_not_founder_approved")
        if not (org.founder_org_approval_ref or "").strip():
            blockers.append("founder_org_approval_ref_missing")
        if not (org.sponsor_label or "").strip():
            blockers.append("sponsor_label_missing")
        if not (org.legal_name or "").strip():
            blockers.append("legal_name_missing")
        if len(_parse_emails(org.recipient_emails_json)) < 1:
            blockers.append("recipients_required")
    cu = load_customer_usable_readiness()
    if not cu.get("multi_role_journey_customer_usable", True):
        blockers.append("customer_usable_journey_regression")
    ref = (founder_send_approval_ref or "").strip()
    if len(ref) < 8:
        blockers.append("founder_send_approval_ref_required_at_send_time")
    allowed = len(blockers) == 0
    return {
        "ok": allowed,
        "allowed": allowed,
        "can_send": allowed,
        "blockers": blockers,
        "requires_founder_send_approval_ref": True,
        "min_ref_length": 8,
        "pack": pack_to_dict(pack),
        "organization": org_to_dict(org) if org else None,
        "frozen": {
            "launch": "NO-GO",
            "enrollment": "OFF",
            "phase_3b": "BLOCKED",
            "mass_outreach": "FORBIDDEN",
        },
    }


def resolve_first_real_pilot_activation(
    db: Session,
    settings: Settings | None = None,
    *,
    multi_role_customer_usable: bool | None = None,
) -> dict[str, Any]:
    """Truthful activation outcome — never invents orgs or send events."""
    s = settings or get_settings()
    cu = load_customer_usable_readiness()
    journey_ok = (
        multi_role_customer_usable
        if multi_role_customer_usable is not None
        else bool(cu.get("multi_role_journey_customer_usable", True))
    )
    if not journey_ok:
        return {
            "outcome": ACTIVATION_BLOCKED_REGRESSION,
            "evidence_tier": "blocked",
            "missing_inputs": ["multi_role_customer_usable_journey"],
            "approved_real_orgs": 0,
            "packs_ready_unsent": 0,
            "packs_sent": 0,
            "real_customer_validated": False,
            "kpi_token": KPI_NO_REAL,
        }

    orgs = list_organizations(db, include_synthetic=True)
    real_approved = [
        o for o in orgs if o["approval_status"] == APPROVAL_FOUNDER_APPROVED and not o["is_synthetic"]
    ]
    packs = [pack_to_dict(p) for p in db.query(PilotInvitationPack).order_by(PilotInvitationPack.id).all()]
    packs_unsent = [p for p in packs if p["status"] == PACK_READY_UNSENT]
    packs_sent = [p for p in packs if p["status"] == PACK_SENT]
    candidates = [o for o in orgs if o["approval_status"] == APPROVAL_CANDIDATE and not o["is_synthetic"]]

    missing: list[str] = []
    if not real_approved:
        missing.extend(
            [
                "founder_approved_real_organization",
                "legal_name",
                "sponsor_label",
                "founder_org_approval_ref",
                "named_recipient_emails",
                "approved_by_label",
            ]
        )
        if not candidates:
            missing.append("organization_candidate_record")
        outcome = ACTIVATION_APPROVAL_REQUIRED
        evidence_tier = "activation_system_ready_awaiting_founder"
    elif packs_sent:
        # Sent ≠ activated users observed; do not claim ACTIVE without activation signals.
        outcome = ACTIVATION_INVITES_SENT_AWAITING
        evidence_tier = "invitations_sent_awaiting_activation"
    elif packs_unsent or real_approved:
        # Approved; pack may still need prepare — treat as A when pack READY_UNSENT exists,
        # else still APPROVAL path completed with pack action pending.
        if packs_unsent:
            outcome = ACTIVATION_APPROVED_PACK_UNSENT
            evidence_tier = "approved_pack_ready_unsent"
        else:
            outcome = ACTIVATION_APPROVED_PACK_UNSENT
            evidence_tier = "approved_awaiting_pack_prepare"
            missing.append("invitation_pack_prepare")
    else:
        outcome = ACTIVATION_APPROVAL_REQUIRED
        evidence_tier = "activation_system_ready_awaiting_founder"

    gate = evaluate_launch_go_gate(db, s)
    return {
        "outcome": outcome,
        "evidence_tier": evidence_tier,
        "missing_inputs": missing,
        "intake_required_fields": list(INTAKE_REQUIRED_FIELDS),
        "approved_real_orgs": len(real_approved),
        "candidate_orgs": len(candidates),
        "packs_ready_unsent": len(packs_unsent),
        "packs_sent": len(packs_sent),
        "real_customer_validated": False,  # requires observed activation, not just send
        "real_pilot_data": gate["kpi_token"] != KPI_NO_REAL,
        "kpi_token": gate["kpi_token"],
        "launch_decision": "NO-GO",
        "canonical_url": temporary_pilot_canonical_url(s),
        "synthetic_blocked_slugs": sorted(_SYNTHETIC_SLUGS),
        "note": "synthetic≠real; do not invent org/sponsor/recipients/approval/send",
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
    scores = compute_first_customer_scores(db, s)
    sent_real = any(p["status"] == PACK_SENT for p in packs) and len(real_approved) >= 1
    activation = resolve_first_real_pilot_activation(db, s)

    # Prefer activation outcome for ops; keep first_customer nested for compatibility
    verdict = activation["outcome"]
    if sent_real and launch_gate["counts"]["named_real_recipients"] >= 1:
        os_alias = OS_ACTIVE
    else:
        os_alias = OS_AWAITING_ORG

    return {
        "schema": "twin.controlled_pilot_os/v2",
        "generated_at": _utcnow().isoformat() + "Z",
        "verdict": verdict,
        "activation": activation,
        "os_verdict_alias": os_alias,
        "first_customer": scores,
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
        "support_tickets_open": list_support_tickets(db, status="open", limit=20),
        "launch_go_gate": launch_gate,
        "customer_usable": load_customer_usable_readiness(),
        "next_founder_action": (
            "Submit complete Founder intake (legal name, sponsor, approval ref, named recipients) "
            "via /admin/pilot-os — do not invent customers. Synthetic nova-hiring-pl is blocked."
            if activation["outcome"] == ACTIVATION_APPROVAL_REQUIRED
            else (
                "Prepare invitation pack (READY_UNSENT). Send only with separate founder_send_approval_ref."
                if activation["outcome"] == ACTIVATION_APPROVED_PACK_UNSENT
                and activation.get("packs_ready_unsent", 0) == 0
                else (
                    "Send only with founder_send_approval_ref ≥8 chars after safety gate PASS. "
                    "Do not mass-outreach. Launch stays NO-GO."
                    if activation["outcome"] == ACTIVATION_APPROVED_PACK_UNSENT
                    else (
                        "Observe activation — do not impersonate users. First-week playbook applies. "
                        "Launch remains NO-GO."
                        if activation["outcome"]
                        in {ACTIVATION_INVITES_SENT_AWAITING, ACTIVATION_ACTIVE}
                        else "Repair customer-usable multi-role journey before activating a real org."
                    )
                )
            )
        ),
        "docs": {
            "os_index": "docs/CONTROLLED_PILOT_OPERATING_SYSTEM.md",
            "first_customer_checklists": "docs/FIRST_CUSTOMER_SUCCESS_CHECKLISTS.md",
            "first_customer_readiness": "docs/FIRST_CUSTOMER_READINESS.json",
            "first_real_pilot_activation": "docs/FIRST_REAL_PILOT_ACTIVATION.json",
            "manifest": "docs/CONTROLLED_PILOT_OS_MANIFEST.json",
            "launch_go_gate": "docs/LAUNCH_GO_EVIDENCE_GATE.json",
            "dns": "docs/RC1_DOMAIN_DNS_FOUNDER_ACTION.md",
            "org_workspace": "docs/PILOT_ORG_SELECTION_WORKSPACE.md",
        },
    }


def load_customer_usable_readiness() -> dict[str, Any]:
    """Truthful customer-usable counts — never alias Hard LIVE 143 as usable.

    Docs may be absent in the API image (backend/ Docker context). Prefer
    embedded defaults that match the last promoted multi-role smoke; overlay
    docs JSON when present at repo root.
    """
    root_candidates = [
        Path(__file__).resolve().parents[3],  # monorepo root when running from backend/
        Path(__file__).resolve().parents[2],  # /app when Docker copies backend as .
    ]
    doc: dict[str, Any] | None = None
    for root in root_candidates:
        path = root / "docs" / "CUSTOMER_USABLE_READINESS.json"
        if path.exists():
            try:
                doc = json.loads(path.read_text(encoding="utf-8"))
                break
            except (OSError, json.JSONDecodeError, TypeError, ValueError):
                continue
    # Also try sibling docs inside image if copied
    for path in (
        Path("/app/docs/CUSTOMER_USABLE_READINESS.json"),
        Path(__file__).resolve().parent.parent / "data" / "CUSTOMER_USABLE_READINESS.json",
    ):
        if doc is None and path.exists():
            try:
                doc = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError, TypeError, ValueError):
                pass

    if doc:
        try:
            counts = doc.get("counts") or {}
            multi = doc.get("multi_role_journey") or {}
            scores = doc.get("scores") or {}
            return {
                "schema": "twin.customer_usable_readiness/v2",
                "customer_usable_pass": int(
                    counts.get("customer_usable_pass") or CUSTOMER_USABLE_PASS_COUNT
                ),
                "hard_live_core_pass_technical": int(
                    doc.get("hard_live_core_pass_technical") or HARD_LIVE_CORE_PASS_TECHNICAL
                ),
                "hard_live_is_technical_only": True,
                "minimal_journey_id": (doc.get("minimal_journey") or {}).get(
                    "id", CUSTOMER_USABLE_MINIMAL_JOURNEY_ID
                ),
                "multi_role_journey_id": multi.get("id", CUSTOMER_USABLE_MULTI_ROLE_JOURNEY_ID),
                "minimal_journey_customer_usable": bool(
                    (doc.get("minimal_journey") or {}).get("customer_usable", True)
                ),
                "multi_role_journey_customer_usable": bool(multi.get("customer_usable", True)),
                "real_customer_validated": bool(multi.get("real_customer_validated", False)),
                "real_pilot_data": bool(multi.get("real_pilot_data", False)),
                "evidence_label": doc.get("evidence_label")
                or "production_smoked_synthetic≠real_customer_validated≠real_pilot_data",
                "scores": {
                    "technical_existence_score": int(scores.get("technical_existence_score") or 100),
                    "customer_usable_synthetic_score": int(
                        scores.get("customer_usable_synthetic_score") or 92
                    ),
                    "real_customer_validation_score": int(
                        scores.get("real_customer_validation_score") or 0
                    ),
                    "launch_go_readiness_score_cap": int(
                        scores.get("launch_go_readiness_score_cap") or 15
                    ),
                },
                "verdict": doc.get("verdict") or CUSTOMER_USABLE_VERDICT_COMPLETE,
                "pilot_stance": doc.get("pilot_stance") or PILOT_READY,
            }
        except (TypeError, ValueError):
            pass
    return {
        "schema": "twin.customer_usable_readiness/v2",
        "customer_usable_pass": CUSTOMER_USABLE_PASS_COUNT,
        "hard_live_core_pass_technical": HARD_LIVE_CORE_PASS_TECHNICAL,
        "hard_live_is_technical_only": True,
        "minimal_journey_id": CUSTOMER_USABLE_MINIMAL_JOURNEY_ID,
        "multi_role_journey_id": CUSTOMER_USABLE_MULTI_ROLE_JOURNEY_ID,
        "minimal_journey_customer_usable": True,
        "multi_role_journey_customer_usable": True,
        "real_customer_validated": False,
        "real_pilot_data": False,
        "evidence_label": "production_smoked_synthetic≠real_customer_validated≠real_pilot_data",
        "scores": {
            "technical_existence_score": 100,
            "customer_usable_synthetic_score": 92,
            "real_customer_validation_score": 0,
            "launch_go_readiness_score_cap": 15,
        },
        "verdict": CUSTOMER_USABLE_VERDICT_COMPLETE,
        "pilot_stance": PILOT_READY,
    }


def load_os_manifest() -> dict[str, Any]:
    root = Path(__file__).resolve().parents[3]
    path = root / "docs" / "CONTROLLED_PILOT_OS_MANIFEST.json"
    if not path.exists():
        return {"schema": "twin.controlled_pilot_os.manifest/v1", "missing": True}
    return json.loads(path.read_text(encoding="utf-8"))
