"""Candidate profile and match endpoints."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.database.models import Candidate, User
from app.database.session import get_db
from app.schemas.candidate import (
    CandidateCreate,
    CandidateOut,
    CandidateUpdate,
    CvUploadOut,
    IntroAudioUploadOut,
)
from app.schemas.match import JobMatchListOut, JobMatchOut
from app.services.cv_parser import CvParseError
from app.services.cv_storage import delete_cv_for_candidate, save_cv_for_candidate
from app.services.intro_audio_storage import save_intro_audio_for_candidate
from app.services.matching_service import find_top_matches

router = APIRouter()


@router.post("/", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def create_profile(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateOut:
    if db.query(Candidate).filter(Candidate.user_id == user.id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile already exists")
    candidate = _build_candidate(user.id, body)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _to_out(candidate)


@router.get("/me", response_model=CandidateOut)
def get_my_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateOut:
    candidate = _get_candidate_or_404(db, user.id)
    return _to_out(candidate)


@router.put("/me", response_model=CandidateOut)
def update_profile(
    body: CandidateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateOut:
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        candidate = _build_candidate(user.id, body)
        db.add(candidate)
    else:
        _apply_update(candidate, body)
    db.commit()
    db.refresh(candidate)
    return _to_out(candidate)


@router.post("/me/cv", response_model=CvUploadOut)
async def upload_cv(
    file: UploadFile = File(...),
    processing_consent: bool = Form(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CvUploadOut:
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create your profile first, then upload a CV.",
        )
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing filename")

    if candidate.cv_processing_consent_at is None:
        if not processing_consent:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CV upload requires explicit consent to storage and automated parsing (see Privacy Policy).",
            )
        candidate.cv_processing_consent_at = datetime.now(timezone.utc)
        db.add(candidate)
        db.flush()

    content = await file.read()
    max_bytes = get_settings().cv_max_bytes
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {max_bytes // (1024 * 1024)} MB).",
        )
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    try:
        candidate = save_cv_for_candidate(
            db, candidate, content=content, filename=file.filename
        )
    except CvParseError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    skills = json.loads(candidate.skills) if candidate.skills else []
    titles_raw = json.loads(candidate.preferred_job_titles) if candidate.preferred_job_titles else []
    titles = [str(t) for t in titles_raw] if isinstance(titles_raw, list) else []
    cv_insights = _cv_insights_from_candidate(candidate)
    return CvUploadOut(
        message="CV uploaded and profile updated for better matching.",
        has_cv=True,
        cv_filename=candidate.cv_filename,
        skills_updated=skills,
        preferred_job_titles=titles,
        experience_years=candidate.experience_years,
        location=candidate.location,
        cv_insights=cv_insights,
    )


@router.post("/me/intro-audio", response_model=IntroAudioUploadOut)
async def upload_intro_audio(
    file: UploadFile = File(...),
    processing_consent: bool = Form(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> IntroAudioUploadOut:
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create your profile first, then upload audio.",
        )
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing filename")

    if candidate.intro_audio_processing_consent_at is None:
        if not processing_consent:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Voice intro upload requires explicit consent to storage and future processing (see Privacy Policy).",
            )
        candidate.intro_audio_processing_consent_at = datetime.now(timezone.utc)
        db.add(candidate)
        db.flush()

    content = await file.read()
    max_bytes = get_settings().intro_audio_max_bytes
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {max_bytes // (1024 * 1024)} MB).",
        )
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    try:
        candidate = save_intro_audio_for_candidate(db, candidate, content=content, filename=file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return IntroAudioUploadOut(
        message=(
            "Audio saved. Transcription and AI preference extraction are not enabled in this build — "
            "set up a speech-to-text provider and wire it in intro_audio_storage (see .env.example)."
        ),
        has_intro_audio=True,
        intro_audio_uploaded_at=candidate.intro_audio_uploaded_at,
        transcription_status="skipped",
    )


@router.delete("/me/cv", response_model=CandidateOut)
def remove_cv(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateOut:
    candidate = _get_candidate_or_404(db, user.id)
    candidate = delete_cv_for_candidate(db, candidate)
    return _to_out(candidate)


@router.get("/me/matches", response_model=JobMatchListOut)
def get_my_matches(
    limit: int = Query(10, ge=1, le=400),
    min_score: float = Query(40.0, ge=0, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobMatchListOut:
    candidate = _get_candidate_or_404(db, user.id)
    rows = find_top_matches(db, candidate, limit=limit, min_score=min_score)
    items = [JobMatchOut(**row) for row in rows]
    return JobMatchListOut(items=items, total=len(items))


def _get_candidate_or_404(db: Session, user_id: int) -> Candidate:
    candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return candidate


def _normalize_titles(body: CandidateCreate | CandidateUpdate) -> list[str]:
    raw = getattr(body, "preferred_job_titles", None) or []
    out: list[str] = []
    for t in raw:
        s = str(t).strip()
        if s and s not in out:
            out.append(s[:120])
        if len(out) >= 25:
            break
    return out


def _build_candidate(user_id: int, body: CandidateCreate | CandidateUpdate) -> Candidate:
    opt_in = getattr(body, "talent_pool_opt_in", None)
    if opt_in is None:
        opt_in_default = False
    else:
        opt_in_default = bool(opt_in)
    return Candidate(
        user_id=user_id,
        name=body.name,
        skills=json.dumps(body.skills),
        preferred_job_titles=json.dumps(_normalize_titles(body)),
        experience_years=body.experience_years,
        desired_salary=body.desired_salary,
        location=body.location,
        talent_pool_opt_in=opt_in_default,
    )


def _apply_update(candidate: Candidate, body: CandidateUpdate) -> None:
    candidate.name = body.name
    candidate.skills = json.dumps(body.skills)
    candidate.preferred_job_titles = json.dumps(_normalize_titles(body))
    candidate.experience_years = body.experience_years
    candidate.desired_salary = body.desired_salary
    candidate.location = body.location
    if body.talent_pool_opt_in is not None:
        candidate.talent_pool_opt_in = body.talent_pool_opt_in
    if body.cv_processing_consent is True:
        candidate.cv_processing_consent_at = datetime.now(timezone.utc)
    elif body.cv_processing_consent is False:
        candidate.cv_processing_consent_at = None
    if body.intro_audio_processing_consent is True:
        candidate.intro_audio_processing_consent_at = datetime.now(timezone.utc)
    elif body.intro_audio_processing_consent is False:
        candidate.intro_audio_processing_consent_at = None


def _cv_insights_from_candidate(candidate: Candidate) -> dict[str, Any] | None:
    if not candidate.profile_signals_json:
        return None
    try:
        blob = json.loads(candidate.profile_signals_json)
    except json.JSONDecodeError:
        return None
    if not isinstance(blob, dict):
        return None
    raw = blob.get("cv_insights")
    return raw if isinstance(raw, dict) else None


def _to_out(candidate: Candidate) -> CandidateOut:
    skills = json.loads(candidate.skills) if candidate.skills else []
    titles_raw = json.loads(candidate.preferred_job_titles) if candidate.preferred_job_titles else []
    titles = [str(t) for t in titles_raw] if isinstance(titles_raw, list) else []
    return CandidateOut(
        id=candidate.id,
        name=candidate.name,
        skills=skills,
        preferred_job_titles=titles,
        experience_years=candidate.experience_years,
        desired_salary=candidate.desired_salary,
        location=candidate.location,
        talent_pool_opt_in=bool(candidate.talent_pool_opt_in),
        has_cv=bool(candidate.cv_text),
        cv_filename=candidate.cv_filename,
        cv_uploaded_at=candidate.cv_uploaded_at,
        has_intro_audio=bool(candidate.intro_audio_path),
        intro_audio_uploaded_at=candidate.intro_audio_uploaded_at,
        cv_insights=_cv_insights_from_candidate(candidate),
        cv_processing_consent_at=candidate.cv_processing_consent_at,
        intro_audio_processing_consent_at=candidate.intro_audio_processing_consent_at,
    )
