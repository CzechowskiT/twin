"""Application Studio API — evidence-backed preparation; never external submit."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import application_studio as studio
from app.services import career_copilot as cc

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create your profile first")
    return row


class WorkspaceIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    opportunity: dict[str, Any] = Field(default_factory=dict)
    application_id: int | None = None


class EvidenceIdsIn(BaseModel):
    evidence_ids: list[int] = Field(default_factory=list)


class ScreeningIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    answer_text: str = Field(default="", max_length=8000)
    evidence_ids: list[int] = Field(default_factory=list)


class AssetIn(BaseModel):
    asset_kind: str = Field(default="document", max_length=64)
    title: str = Field(..., min_length=1, max_length=300)
    evidence_ids: list[int] = Field(default_factory=list)


class ApproveIn(BaseModel):
    artifact_type: str = Field(..., pattern="^(cv|cover|screening)$")
    artifact_id: int
    approved: bool = True


class DeclareIn(BaseModel):
    channel: str = Field(..., pattern="^(manual_external|email_self|portal_self|other_candidate)$")
    notes: str = Field(default="", max_length=2000)


class PrivacyIn(BaseModel):
    ai_drafting_opt_in: bool | None = None
    memory_reuse_opt_in: bool | None = None
    export_include_confidential: bool | None = None
    paused: bool | None = None


@router.get("/me/application-studio")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return studio.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/application-studio/workspaces", status_code=status.HTTP_201_CREATED)
def post_workspace(
    body: WorkspaceIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = studio.create_workspace(
            db,
            candidate_id=cand.id,
            title=cc.scrub_prompt_injection(body.title),
            opportunity=body.opportunity,
            application_id=body.application_id,
            is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"workspace": studio._ser_workspace(row)}


@router.get("/me/application-studio/workspaces/{workspace_id}")
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = studio._workspace(db, candidate_id=cand.id, workspace_id=workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"workspace": studio._ser_workspace(row)}


@router.post("/me/application-studio/workspaces/{workspace_id}/refresh-fit")
def post_refresh_fit(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = studio.refresh_fit(db, candidate_id=cand.id, workspace_id=workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"workspace": studio._ser_workspace(row)}


@router.post("/me/application-studio/workspaces/{workspace_id}/cv-draft", status_code=status.HTTP_201_CREATED)
def post_cv_draft(
    workspace_id: int,
    body: EvidenceIdsIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        draft = studio.draft_tailored_cv(
            db, candidate_id=cand.id, workspace_id=workspace_id, evidence_ids=body.evidence_ids
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"cv_draft": studio._ser_cv(draft)}


@router.post(
    "/me/application-studio/workspaces/{workspace_id}/cover-letter",
    status_code=status.HTTP_201_CREATED,
)
def post_cover(
    workspace_id: int,
    body: EvidenceIdsIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        letter = studio.draft_cover_letter(
            db, candidate_id=cand.id, workspace_id=workspace_id, evidence_ids=body.evidence_ids
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"cover_letter": studio._ser_cover(letter)}


@router.post(
    "/me/application-studio/workspaces/{workspace_id}/screening",
    status_code=status.HTTP_201_CREATED,
)
def post_screening(
    workspace_id: int,
    body: ScreeningIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        ans = studio.add_screening_answer(
            db,
            candidate_id=cand.id,
            workspace_id=workspace_id,
            question=cc.scrub_prompt_injection(body.question),
            answer_text=cc.scrub_prompt_injection(body.answer_text or ""),
            evidence_ids=body.evidence_ids,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"answer": studio._ser_answer(ans)}


@router.post(
    "/me/application-studio/workspaces/{workspace_id}/assets",
    status_code=status.HTTP_201_CREATED,
)
def post_asset(
    workspace_id: int,
    body: AssetIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        asset = studio.register_asset(
            db,
            candidate_id=cand.id,
            workspace_id=workspace_id,
            asset_kind=body.asset_kind,
            title=cc.scrub_prompt_injection(body.title),
            evidence_ids=body.evidence_ids,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"asset": studio._ser_asset(asset)}


@router.post("/me/application-studio/workspaces/{workspace_id}/approve")
def post_approve(
    workspace_id: int,
    body: ApproveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        out = studio.approve_artifact(
            db,
            candidate_id=cand.id,
            workspace_id=workspace_id,
            artifact_type=body.artifact_type,
            artifact_id=body.artifact_id,
            approved=body.approved,
        )
    except ValueError as exc:
        code = status.HTTP_404_NOT_FOUND if "not_found" in str(exc) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(code, detail=str(exc)) from exc
    return out


@router.post("/me/application-studio/workspaces/{workspace_id}/declare-submission")
def post_declare(
    workspace_id: int,
    body: DeclareIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        sub = studio.declare_submission(
            db,
            candidate_id=cand.id,
            workspace_id=workspace_id,
            channel=body.channel,
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "submission": {
            "id": sub.id,
            "status": sub.status,
            "provenance": sub.provenance,
            "external_submit": False,
            "declared_channel": sub.declared_channel,
        }
    }


@router.post("/me/application-studio/workspaces/{workspace_id}/interview-handoff")
def post_handoff(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        pack = studio.interview_handoff(db, candidate_id=cand.id, workspace_id=workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"handoff": pack}


@router.get("/me/application-studio/workspaces/{workspace_id}/export")
def get_export(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return studio.export_workspace(db, candidate_id=cand.id, workspace_id=workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/me/application-studio/workspaces/{workspace_id}/delete")
def post_delete(
    workspace_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return studio.delete_workspace(db, candidate_id=cand.id, workspace_id=workspace_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/me/application-studio/privacy")
def patch_privacy(
    body: PrivacyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = studio.update_privacy(
        db,
        candidate_id=cand.id,
        ai_drafting_opt_in=body.ai_drafting_opt_in,
        memory_reuse_opt_in=body.memory_reuse_opt_in,
        export_include_confidential=body.export_include_confidential,
        paused=body.paused,
    )
    return {
        "privacy": {
            "ai_drafting_opt_in": row.ai_drafting_opt_in,
            "paused": row.paused,
            "export_include_confidential": row.export_include_confidential,
        }
    }


# ── Daily OS 404 debt closure: live brief path ──────────────────────────────


@router.get("/me/daily-os/brief")
def get_daily_os_brief_alias(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Canonical live Daily OS brief path (closes historical /daily-os/brief 404)."""
    from app.services import career_daily_os as daily_os

    cand = _candidate(db, user)
    brief = daily_os.ensure_daily_brief(db, candidate_id=cand.id, force=False)
    return {
        "schema": "twin.daily_os_brief/v1",
        "brief": brief,
        "path": "/api/v1/candidates/me/daily-os/brief",
        "canonical_also": "/api/v1/candidates/me/career-copilot/daily",
        "kpi_excluded": True,
        "phase_3_career_agent": "NOT_STARTED",
    }
