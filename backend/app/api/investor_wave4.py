"""Investor Wave 4 API — NDA, data room metadata, attestations HITL, readonly diligence."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services import investor_wave4 as wave4

router = APIRouter()


class EvidenceMarkIn(BaseModel):
    module_id: str = Field(..., min_length=2, max_length=128)
    status: str = Field(
        ...,
        pattern=r"^(PASS|FAIL|PENDING_SMOKE|HELD_POLICY|PARTIAL|DEMO_ONLY)$",
    )
    smoke_sha: str | None = Field(None, max_length=64)
    notes: str | None = Field(None, max_length=2000)


class NdaAcceptIn(BaseModel):
    nda_version: str = Field(..., min_length=4, max_length=32)


class AttestationCreateIn(BaseModel):
    subject_label: str = Field(..., min_length=2, max_length=255)
    claim_text: str = Field(..., min_length=8, max_length=8000)
    evidence_ref: str | None = Field(None, max_length=512)


class AttestationSignIn(BaseModel):
    signed_by: str = Field(..., min_length=2, max_length=255)


@router.get("/status")
def get_wave4_status(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    return wave4.wave4_status(db)


@router.get("/hard-live/evidence")
def get_hard_live_evidence(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
    persona: str | None = Query(default="platform", max_length=32),
    wave: str | None = Query(default="4", max_length=16),
) -> dict:
    return wave4.list_hard_live_evidence(db, persona=persona, wave=wave)


@router.post("/hard-live/evidence/mark", status_code=status.HTTP_200_OK)
def mark_hard_live_evidence(
    body: EvidenceMarkIn,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """Authenticated mark after smoke — does not flip Gate F / Launch / Pilot."""
    try:
        return wave4.mark_evidence_after_smoke(
            db,
            module_id=body.module_id,
            status=body.status,
            smoke_sha=body.smoke_sha,
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/policy-holds")
def get_policy_holds(
    _user: User = Depends(get_current_user),
) -> dict:
    return wave4.policy_holds()


@router.post("/nda/accept", status_code=status.HTTP_200_OK)
def post_nda_accept(
    body: NdaAcceptIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        return wave4.record_nda_acceptance(
            db,
            user=user,
            nda_version=body.nda_version,
            ip_hint=request.client.host if request.client else None,
            user_agent_hint=request.headers.get("user-agent"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/nda/status")
def get_nda_status(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return wave4.nda_status(db, user=user)


@router.get("/data-room/documents")
def get_data_room_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return wave4.list_data_room_documents(db, user=user)


@router.get("/placement/summary")
def get_placement_summary(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    return wave4.placement_readonly_summary(db)


@router.get("/trust-proof/summary")
def get_trust_proof_summary(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    return wave4.trust_proof_readonly_summary(db)


@router.get("/board/readiness")
def get_board_readiness(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    return wave4.board_readiness_snapshot(db)


@router.post("/attestations", status_code=status.HTTP_201_CREATED)
def post_attestation(
    body: AttestationCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Create PENDING_FOUNDER_SIGNATURE attestation — does not claim verified customers."""
    try:
        return wave4.create_external_attestation(
            db,
            user=user,
            subject_label=body.subject_label,
            claim_text=body.claim_text,
            evidence_ref=body.evidence_ref,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/attestations")
def get_attestations(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
    status_filter: str | None = Query(default=None, alias="status", max_length=64),
) -> dict:
    try:
        return wave4.list_external_attestations(db, status=status_filter)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/attestations/{attestation_id}/sign", status_code=status.HTTP_200_OK)
def post_attestation_sign(
    attestation_id: int,
    body: AttestationSignIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        return wave4.sign_external_attestation(
            db,
            user=user,
            attestation_id=attestation_id,
            signed_by=body.signed_by,
        )
    except ValueError as exc:
        detail = str(exc)
        code = (
            status.HTTP_404_NOT_FOUND
            if detail == "attestation_not_found"
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(status_code=code, detail=detail) from exc


@router.post("/attestations/{attestation_id}/reject", status_code=status.HTTP_200_OK)
def post_attestation_reject(
    attestation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        return wave4.reject_external_attestation(
            db,
            user=user,
            attestation_id=attestation_id,
        )
    except ValueError as exc:
        detail = str(exc)
        code = (
            status.HTTP_404_NOT_FOUND
            if detail == "attestation_not_found"
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(status_code=code, detail=detail) from exc
