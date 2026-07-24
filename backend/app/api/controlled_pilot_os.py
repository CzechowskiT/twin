"""Controlled Pilot OS admin API — ops Bearer only; never invent customers."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_db
from app.services import controlled_pilot_os as pilot_os

router = APIRouter()


def _require_ops_admin(settings: Settings, authorization: str | None) -> None:
    token = settings.ops_admin_token.strip() or settings.beta_admin_token.strip()
    if not token:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Ops admin token not configured")
    if (authorization or "").strip() != f"Bearer {token}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")


class OrgCreateBody(BaseModel):
    slug: str = Field(..., min_length=3, max_length=80)
    display_name: str = Field(..., min_length=2, max_length=200)
    legal_name: str | None = Field(None, max_length=200)
    sponsor_label: str | None = Field(None, max_length=120)
    market: str = Field(default="PL", max_length=64)
    recipient_emails: list[str] = Field(default_factory=list)
    notes: str | None = Field(None, max_length=2000)
    is_synthetic: bool = False


class OrgApproveBody(BaseModel):
    approved_by_label: str = Field(..., min_length=2, max_length=120)
    founder_org_approval_ref: str = Field(..., min_length=8, max_length=128)
    sponsor_label: str | None = Field(None, max_length=120)
    legal_name: str | None = Field(None, max_length=200)
    recipient_emails: list[str] | None = None
    notes: str | None = Field(None, max_length=2000)


class PackPrepareBody(BaseModel):
    notes: str | None = Field(None, max_length=2000)


class PackSendBody(BaseModel):
    founder_send_approval_ref: str = Field(..., min_length=8, max_length=128)


class SupportTicketBody(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200)
    category: str = Field(default="general", max_length=64)
    severity: str = Field(default="normal", max_length=16)
    body_summary: str | None = Field(None, max_length=2000)
    organization_id: int | None = None


@router.get("/pilot-os/status")
def pilot_os_status(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    return pilot_os.build_os_status(db, settings)


@router.get("/pilot-os/launch-go-gate")
def pilot_os_launch_go_gate(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    return pilot_os.evaluate_launch_go_gate(db, settings)


@router.get("/pilot-os/organizations")
def list_pilot_orgs(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    return {"organizations": pilot_os.list_organizations(db)}


@router.post("/pilot-os/organizations")
def create_pilot_org(
    body: OrgCreateBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    try:
        org = pilot_os.create_organization_candidate(
            db,
            slug=body.slug,
            display_name=body.display_name,
            market=body.market,
            recipient_emails=body.recipient_emails,
            notes=body.notes,
            is_synthetic=body.is_synthetic,
            legal_name=body.legal_name,
            sponsor_label=body.sponsor_label,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"organization": pilot_os.org_to_dict(org)}


@router.post("/pilot-os/organizations/{org_id}/approve")
def approve_pilot_org(
    org_id: int,
    body: OrgApproveBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    try:
        org = pilot_os.founder_approve_organization(
            db,
            org_id=org_id,
            approved_by_label=body.approved_by_label,
            recipient_emails=body.recipient_emails,
            notes=body.notes,
            founder_org_approval_ref=body.founder_org_approval_ref,
            legal_name=body.legal_name,
            sponsor_label=body.sponsor_label,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"organization": pilot_os.org_to_dict(org)}


@router.post("/pilot-os/organizations/{org_id}/invitation-packs")
def prepare_pack(
    org_id: int,
    body: PackPrepareBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    try:
        pack = pilot_os.prepare_invitation_pack(db, org_id=org_id, notes=body.notes)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"invitation_pack": pilot_os.pack_to_dict(pack)}


@router.get("/pilot-os/invitation-packs/{pack_id}/send-safety")
def send_pack_safety(
    pack_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Pre-flight safety gate — does not send mail."""
    _require_ops_admin(settings, authorization)
    return pilot_os.evaluate_send_safety_gate(db, settings, pack_id=pack_id)


@router.post("/pilot-os/invitation-packs/{pack_id}/send")
def send_pack(
    pack_id: int,
    body: PackSendBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    gate = pilot_os.evaluate_send_safety_gate(
        db,
        settings,
        pack_id=pack_id,
        founder_send_approval_ref=body.founder_send_approval_ref,
    )
    if not gate.get("allowed"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail={
                "message": "Send safety gate blocked invitation delivery",
                "send_safety_gate": gate,
            },
        )
    try:
        pack = pilot_os.send_invitation_pack(
            db,
            pack_id=pack_id,
            founder_send_approval_ref=body.founder_send_approval_ref,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"invitation_pack": pilot_os.pack_to_dict(pack), "send_safety_gate": gate}


@router.post("/pilot-os/support-tickets")
def create_support_ticket(
    body: SupportTicketBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    ticket = pilot_os.open_support_ticket(
        db,
        subject=body.subject,
        category=body.category,
        severity=body.severity,
        body_summary=body.body_summary,
        organization_id=body.organization_id,
    )
    return {"ticket": pilot_os.ticket_to_dict(ticket)}


@router.get("/pilot-os/support-tickets")
def list_support_tickets(
    status: str | None = "open",
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    return {"tickets": pilot_os.list_support_tickets(db, status=status)}


class SupportResolveBody(BaseModel):
    resolution_notes: str | None = Field(None, max_length=4000)
    assigned_to_label: str | None = Field(None, max_length=120)


@router.post("/pilot-os/support-tickets/{ticket_id}/resolve")
def resolve_support_ticket(
    ticket_id: int,
    body: SupportResolveBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    try:
        ticket = pilot_os.resolve_support_ticket(
            db,
            ticket_id=ticket_id,
            resolution_notes=body.resolution_notes,
            assigned_to_label=body.assigned_to_label,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"ticket": pilot_os.ticket_to_dict(ticket)}


@router.get("/pilot-os/first-customer")
def first_customer_scores(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    return pilot_os.compute_first_customer_scores(db, settings)
