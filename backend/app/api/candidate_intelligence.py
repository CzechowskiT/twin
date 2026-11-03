"""AI Candidate Intelligence API — explainable CV screening (ops or JWT)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_db
from app.core.security import decode_access_token
from app.database.models import (
    Candidate,
    CandidateIntelligenceProfile,
    CandidateMissingInformation,
    User,
)
from app.services import candidate_intelligence as intel

router = APIRouter()
_oauth_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def _authorize(
    db: Session,
    settings: Settings,
    authorization: str | None,
    token: str | None,
) -> User | None:
    ops = settings.ops_admin_token.strip() or settings.beta_admin_token.strip()
    if authorization and ops and authorization.strip() == f"Bearer {ops}":
        return None  # ops mode
    raw = token
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization.split(" ", 1)[1].strip()
    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    if ops and raw == ops:
        return None
    email = decode_access_token(raw)
    if not email:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return user


class CorrectionBody(BaseModel):
    corrections: dict = Field(default_factory=dict)
    regenerate: bool = True


class OverrideBody(BaseModel):
    override_band: str = Field(..., min_length=5, max_length=16)
    notes: str | None = Field(None, max_length=2000)
    actor_label: str = Field(default="recruiter", max_length=120)


class ProcessBody(BaseModel):
    job_id: int | None = None
    force: bool = False
    locale: str = "en"


class SyntheticCvBody(BaseModel):
    """Ops/smoke only — synthetic CV text, never log full body in reports."""

    cv_text: str = Field(..., min_length=40, max_length=20000)
    process: bool = True
    job_id: int | None = None
    locale: str = "en"


@router.get("/candidates/{candidate_id}/intelligence")
def get_intelligence(
    candidate_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
    token: str | None = Depends(_oauth_optional),
) -> dict:
    _authorize(db, settings, authorization, token)
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    profile = (
        db.query(CandidateIntelligenceProfile)
        .filter(CandidateIntelligenceProfile.candidate_id == candidate_id)
        .one_or_none()
    )
    if profile is None:
        return {
            "ok": True,
            "profile": None,
            "extraction_status": "absent",
            "stance": {
                "human_review_required": True,
                "autonomous_employment_decision": False,
                "ai_assisted": True,
            },
        }
    return {"ok": True, **intel.serialize_bundle(db, profile)}


@router.post("/candidates/{candidate_id}/intelligence/process")
def process_intelligence(
    candidate_id: int,
    body: ProcessBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
    token: str | None = Depends(_oauth_optional),
) -> dict:
    _authorize(db, settings, authorization, token)
    result = intel.run_extraction_pipeline(
        db,
        candidate_id=candidate_id,
        job_id=body.job_id,
        force=body.force,
        locale=body.locale,
    )
    if not result.get("ok"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=result.get("error"))
    return result


@router.post("/candidates/{candidate_id}/intelligence/corrections")
def correct_intelligence(
    candidate_id: int,
    body: CorrectionBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
    token: str | None = Depends(_oauth_optional),
) -> dict:
    _authorize(db, settings, authorization, token)
    try:
        return intel.save_correction(
            db,
            candidate_id=candidate_id,
            corrections=body.corrections,
            regenerate=body.regenerate,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/intelligence/matches/{match_id}/override")
def override_intelligence_match(
    match_id: int,
    body: OverrideBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
    token: str | None = Depends(_oauth_optional),
) -> dict:
    _authorize(db, settings, authorization, token)
    try:
        return {
            "ok": True,
            "match": intel.override_match(
                db,
                match_id=match_id,
                override_band=body.override_band,
                notes=body.notes,
                actor_label=body.actor_label,
            ),
        }
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/candidates/{candidate_id}/intelligence/compact")
def compact_intelligence(
    candidate_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
    token: str | None = Depends(_oauth_optional),
) -> dict:
    _authorize(db, settings, authorization, token)
    return {"ok": True, "card": intel.compact_list_card(db, candidate_id)}


@router.post("/candidates/{candidate_id}/intelligence/clarification-draft")
def clarification_draft(
    candidate_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
    token: str | None = Depends(_oauth_optional),
) -> dict:
    """Create a clarification draft text — never auto-sends."""
    _authorize(db, settings, authorization, token)
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one_or_none()
    if cand is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    profile = (
        db.query(CandidateIntelligenceProfile)
        .filter(CandidateIntelligenceProfile.candidate_id == candidate_id)
        .one_or_none()
    )
    missing = []
    if profile:
        missing = (
            db.query(CandidateMissingInformation)
            .filter(
                CandidateMissingInformation.profile_id == profile.id,
                CandidateMissingInformation.status == "open",
            )
            .limit(5)
            .all()
        )
    fields = ", ".join(m.field for m in missing) or "key experience details"
    draft = (
        f"Hi — reviewing your profile for a role. Could you clarify: {fields}? "
        "This helps our team (humans) assess fit. Thank you."
    )
    return {
        "ok": True,
        "draft": draft,
        "auto_send": False,
        "status": "DRAFT_UNSENT",
        "note": "Clarification drafts never auto-send.",
    }


@router.post("/candidates/{candidate_id}/intelligence/seed-synthetic-cv")
def seed_synthetic_cv(
    candidate_id: int,
    body: SyntheticCvBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
    token: str | None = Depends(_oauth_optional),
) -> dict:
    """Ops-only synthetic CV attach for intelligence smoke — excludes from real KPI."""
    ops = settings.ops_admin_token.strip() or settings.beta_admin_token.strip()
    raw = None
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization.split(" ", 1)[1].strip()
    if not ops or raw != ops:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="ops_only_synthetic_cv_seed")
    try:
        intel.ingest_synthetic_cv_text(db, candidate_id=candidate_id, cv_text=body.cv_text)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if body.process:
        result = intel.run_extraction_pipeline(
            db,
            candidate_id=candidate_id,
            job_id=body.job_id,
            force=True,
            locale=body.locale,
        )
        return {
            "ok": True,
            "seeded": True,
            "synthetic": True,
            "kpi_excluded": True,
            "cv_chars": len(body.cv_text),
            **{k: result.get(k) for k in ("profile", "timeline", "brief", "match", "stance", "missing_information", "signals")},
        }
    return {"ok": True, "seeded": True, "synthetic": True, "kpi_excluded": True}


@router.get("/candidates/{candidate_id}/intelligence/company-subset")
def company_intelligence_subset(
    candidate_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
    token: str | None = Depends(_oauth_optional),
) -> dict:
    """Approved company subset: brief, strengths, gaps, decision state — no recruiter notes."""
    _authorize(db, settings, authorization, token)
    return intel.company_approved_subset(db, candidate_id=candidate_id)
