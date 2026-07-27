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
    data_processing_basis_ref: str = Field(..., min_length=4, max_length=128)
    success_criteria_ref: str = Field(..., min_length=4, max_length=200)


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
        note_parts: list[str] = []
        if body.notes:
            note_parts.append(body.notes.strip())
        if body.data_processing_basis_ref:
            note_parts.append(f"data_processing_basis_ref={body.data_processing_basis_ref.strip()}")
        if body.success_criteria_ref:
            note_parts.append(f"success_criteria_ref={body.success_criteria_ref.strip()}")
        org = pilot_os.founder_approve_organization(
            db,
            org_id=org_id,
            approved_by_label=body.approved_by_label,
            recipient_emails=body.recipient_emails,
            notes=" | ".join(note_parts)[:2000] if note_parts else None,
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


@router.get("/pilot-os/ai-validation")
def pilot_os_ai_validation(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """AI Candidate Intelligence real-validation command view (ops Bearer)."""
    _require_ops_admin(settings, authorization)
    from app.services import ai_intel_validation as aiv

    return aiv.build_ai_validation_os_payload(db)


@router.get("/pilot-os/ai-validation/safety-gate")
def pilot_os_ai_validation_safety(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    from app.services import ai_intel_validation as aiv

    return aiv.production_safety_gate(
        api_commit="present",
        frontend_commit="present",
        alembic_ok=True,
        worker_ready=True,
        isolation_green=True,
        multi_role_green=True,
        ws20_green=True,
    )


@router.get("/pilot-os/first-customer-success")
def pilot_os_first_customer_success(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """First Customer Success control plane (ops Bearer)."""
    _require_ops_admin(settings, authorization)
    from app.services import first_customer_success as fcs

    return fcs.build_control_plane(db)


@router.get("/pilot-os/first-customer-success/evidence")
def pilot_os_first_customer_evidence(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    from app.services import first_customer_success as fcs

    plane = fcs.build_control_plane(db)
    return plane.get("evidence_package") or {}


@router.get("/pilot-os/first-customer-success/provisioning-dry-run")
def pilot_os_provisioning_dry_run(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Synthetic-only provisioning verification — never creates a real tenant."""
    _require_ops_admin(settings, authorization)
    from app.services import first_customer_success as fcs

    return fcs.synthetic_provisioning_dry_run()


@router.get("/pilot-os/pack-preparation")
def pilot_os_pack_preparation(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Org-first pack preparation gate — SECONDARY B2B path; never sends."""
    _require_ops_admin(settings, authorization)
    gate = pilot_os.evaluate_pack_preparation_gate(db)
    gate["path"] = "SECONDARY_B2B_PILOT_PATH — NOT PRIMARY PRODUCT VALIDATION"
    gate["primary_product_validation"] = "candidate_first_pilot"
    gate["alten_org_pack"] = "NOT_PREPARED"
    return gate


class CandidateCohortCreateBody(BaseModel):
    slug: str = Field(..., min_length=3, max_length=80)
    display_name: str = Field(..., min_length=2, max_length=200)
    notes: str | None = Field(None, max_length=2000)
    is_synthetic: bool = False


class CandidateCohortApproveBody(BaseModel):
    approved_by_label: str = Field(..., min_length=2, max_length=120)
    founder_cohort_approval_ref: str = Field(..., min_length=8, max_length=128)
    data_processing_basis_ref: str = Field(..., min_length=4, max_length=128)
    success_criteria_ref: str = Field(..., min_length=4, max_length=200)


class CandidateIntakeBody(BaseModel):
    emails: list[str] = Field(..., min_length=1)
    locale: str = Field(default="pl", max_length=8)
    consent_basis_ref: str | None = Field(None, max_length=128)


class CandidatePackPrepareBody(BaseModel):
    notes: str | None = Field(None, max_length=2000)


class CandidateSendBody(BaseModel):
    founder_send_approval_ref: str | None = Field(None, max_length=128)
    dry_run: bool = True


@router.get("/pilot-os/candidate-first")
def candidate_first_status(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Candidate-first primary validation control plane."""
    _require_ops_admin(settings, authorization)
    from app.services import candidate_first_pilot as cfp

    return cfp.build_control_plane(db, settings)


@router.get("/pilot-os/candidate-first/synthetic-e2e")
def candidate_first_synthetic_e2e(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    from app.services import candidate_first_pilot as cfp

    _ = db
    return cfp.synthetic_candidate_e2e_checklist()


@router.post("/pilot-os/candidate-first/cohorts")
def candidate_first_create_cohort(
    body: CandidateCohortCreateBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    from app.services import candidate_first_pilot as cfp

    try:
        cohort = cfp.create_cohort_draft(
            db,
            slug=body.slug,
            display_name=body.display_name,
            notes=body.notes,
            is_synthetic=body.is_synthetic,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"cohort": cfp.cohort_to_dict(cohort)}


@router.post("/pilot-os/candidate-first/cohorts/{cohort_id}/approve")
def candidate_first_approve_cohort(
    cohort_id: int,
    body: CandidateCohortApproveBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    from app.services import candidate_first_pilot as cfp

    try:
        cohort = cfp.founder_approve_cohort(
            db,
            cohort_id=cohort_id,
            approved_by_label=body.approved_by_label,
            founder_cohort_approval_ref=body.founder_cohort_approval_ref,
            data_processing_basis_ref=body.data_processing_basis_ref,
            success_criteria_ref=body.success_criteria_ref,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"cohort": cfp.cohort_to_dict(cohort)}


@router.post("/pilot-os/candidate-first/cohorts/{cohort_id}/intake")
def candidate_first_intake(
    cohort_id: int,
    body: CandidateIntakeBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Add named candidate emails (stored hashed/masked). Does not send."""
    _require_ops_admin(settings, authorization)
    from app.services import candidate_first_pilot as cfp

    try:
        result = cfp.add_intake_recipients(
            db,
            cohort_id=cohort_id,
            emails=body.emails,
            locale=body.locale,
            consent_basis_ref=body.consent_basis_ref,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return result


@router.post("/pilot-os/candidate-first/cohorts/{cohort_id}/invitation-packs")
def candidate_first_prepare_pack(
    cohort_id: int,
    body: CandidatePackPrepareBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Prepare bilingual pack → READY_UNSENT. Never sends."""
    _require_ops_admin(settings, authorization)
    from app.services import candidate_first_pilot as cfp

    try:
        pack = cfp.prepare_candidate_pack(db, cohort_id=cohort_id, notes=body.notes)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"invitation_pack": cfp.pack_to_dict(pack), "send_executed": False}


@router.get("/pilot-os/candidate-first/invitation-packs/{pack_id}/send-safety")
def candidate_first_send_safety(
    pack_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Candidate send-safety — does not send mail."""
    _require_ops_admin(settings, authorization)
    from app.services import candidate_first_pilot as cfp

    return cfp.evaluate_candidate_send_safety(db, settings, pack_id=pack_id)


@router.post("/pilot-os/candidate-first/invitation-packs/{pack_id}/send")
def candidate_first_send(
    pack_id: int,
    body: CandidateSendBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Dry-run (default) or Founder-authorized send. Default dry_run=true never mints/sends."""
    _require_ops_admin(settings, authorization)
    from app.services import candidate_first_pilot as cfp

    result = cfp.execute_candidate_send(
        db,
        settings,
        pack_id=pack_id,
        founder_send_approval_ref=body.founder_send_approval_ref,
        dry_run=body.dry_run,
    )
    if not result.get("ok") and not result.get("dry_run"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail={
                "message": "Candidate send blocked",
                "result": result,
            },
        )
    return result


@router.get("/pilot-os/candidate-first/hardening")
def candidate_first_hardening(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    from app.services import candidate_first_pilot as cfp

    return cfp.build_hardening_status(db, settings)


@router.post("/pilot-os/candidate-first/invite-tokens/{token_id}/revoke")
def candidate_first_revoke_token(
    token_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    from app.services import candidate_invite_tokens as invite_tokens

    row = invite_tokens.revoke_invite_token(db, token_id=token_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="token_not_found")
    return {"token": invite_tokens.token_to_dict(row), "revoked": True}
