"""Candidate profile and match endpoints."""

import csv
import json
from datetime import datetime, timezone
from urllib.parse import quote
from io import BytesIO, StringIO
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import JSONResponse, Response
from openpyxl import Workbook
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.subscription_gates import Feature, feature_allowed, paywall_for_feature
from app.database.models import Candidate, Job, JobMatchFeedback, User, UserProfileDocument
from app.database.session import get_db
from app.limiter import limiter, user_or_ip_key
from app.schemas.candidate import (
    CandidateCreate,
    CandidateReadinessGateOut,
    CandidateOut,
    CandidateUpdate,
    CvTailoringOut,
    CvTailorIn,
    CvUploadOut,
    IntroAudioUploadOut,
    ProfileDocumentOut,
    ProfileDocumentsListOut,
    ProfileDocumentUploadOut,
)
from app.schemas.candidate_evidence import (
    CandidateEvidenceItemIn,
    CandidateEvidenceItemOut,
    CandidateEvidenceListOut,
)
from app.services.candidate_evidence_vault import (
    create_candidate_evidence_item,
    delete_candidate_evidence_item,
    list_candidate_evidence_items,
)
from app.schemas.career_compass import (
    CareerCompassOut,
    CareerCompassPatchIn,
    CareerCompassPreviewOut,
    CareerCompassPutIn,
)
from app.schemas.candidate_trust import (
    AccountDeleteIn,
    AccountDeleteOut,
    ConsentGrantIn,
    ConsentListOut,
    ConsentPatchIn,
    ConsentReceiptListOut,
    PrivacyRequestCreateIn,
    PrivacyRequestListOut,
    PrivacyRequestOut,
    TrustAuditEventListOut,
    TrustCenterOut,
)
from app.services.candidate_career_compass_persistence import (
    get_compass_row,
    patch_compass,
    serialize_compass,
    upsert_compass,
)
from app.services.candidate_consent_service import (
    grant_consent,
    list_consent_receipts,
    list_consents,
    patch_consent,
)
from app.services.candidate_privacy_request_service import (
    cancel_privacy_request,
    create_privacy_request,
    get_privacy_request,
    list_privacy_requests,
)
from app.services.candidate_account_deletion import execute_candidate_account_deletion
from app.services.candidate_trust_audit_service import list_trust_audit_events
from app.services.candidate_trust_center_service import build_trust_center
from app.schemas.acceptance_queue import AcceptanceQueueOut, AcceptanceRespondIn
from app.schemas.job_match_feedback import (
    JobMatchFeedbackIn,
    JobMatchFeedbackListOut,
    JobMatchFeedbackOut,
)
from app.schemas.match import JobMatchListOut, JobMatchOut
from app.services.acceptance_queue import build_acceptance_queue, respond_acceptance_item
from app.services.candidate_readiness import candidate_has_cv, compute_verified_candidate_gate
from app.services.cv_parser import CvParseError
from app.services.cv_storage import delete_cv_for_candidate, save_cv_for_candidate
from app.services.cv_tailoring import build_cv_tailoring_blob
from app.services.request_locale import locale_from_request
from app.services.intro_audio_storage import save_intro_audio_for_candidate
from app.services.profile_document_storage import (
    delete_profile_document_file,
    read_profile_document_bytes,
    safe_original_filename,
    validate_profile_document_filename,
    write_profile_document_file,
)
from app.services.job_match_feedback import upsert_feedback
from app.services.matching_service import find_top_matches
from app.services.user_data_export import build_user_owned_export_payload

router = APIRouter()


@router.get("/me/verified-readiness", response_model=CandidateReadinessGateOut)
def get_verified_readiness_gate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateReadinessGateOut:
    candidate = _get_candidate_or_404(db, user.id)
    return CandidateReadinessGateOut(**compute_verified_candidate_gate(user, candidate))


@router.post("/", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def create_profile(
    body: CandidateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateOut:
    if db.query(Candidate).filter(Candidate.user_id == user.id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile already exists")
    if body.talent_pool_opt_in and not body.talent_pool_processing_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Talent pool opt-in requires explicit consent (see Privacy Policy).",
        )
    candidate = _build_candidate(user.id, body)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _to_out(db, candidate)


@router.get("/me", response_model=CandidateOut)
def get_my_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateOut:
    candidate = _get_candidate_or_404(db, user.id)
    return _to_out(db, candidate)


def _enforce_profile_edit(user: User) -> None:
    if feature_allowed(user, Feature.PROFILE_EDIT):
        return
    pw = paywall_for_feature(Feature.PROFILE_EDIT)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "message": "Profile is frozen on Standby — upgrade to Standard to edit again.",
            "paywall": pw,
        },
    )


@router.put("/me", response_model=CandidateOut)
@limiter.limit("30/minute", key_func=user_or_ip_key)
def update_profile(
    request: Request,
    body: CandidateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateOut:
    _enforce_profile_edit(user)
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        if body.talent_pool_opt_in and not body.talent_pool_processing_consent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Talent pool opt-in requires explicit consent (see Privacy Policy).",
            )
        candidate = _build_candidate(user.id, body)
        db.add(candidate)
    else:
        _apply_update(candidate, body)
    db.commit()
    db.refresh(candidate)
    return _to_out(db, candidate)


@router.post("/me/cv", response_model=CvUploadOut)
@limiter.limit("20/minute", key_func=user_or_ip_key)
async def upload_cv(
    request: Request,
    file: UploadFile = File(...),
    processing_consent: bool = Form(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CvUploadOut:
    _enforce_profile_edit(user)
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
@limiter.limit("20/minute", key_func=user_or_ip_key)
async def upload_intro_audio(
    request: Request,
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
    return _to_out(db, candidate)


def _profile_docs_storage_covered(db: Session, user: User) -> bool:
    if user.profile_documents_processing_consent_at is not None:
        return True
    cand = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    return bool(cand and cand.cv_processing_consent_at)


def _form_bool_flag(raw: str | None) -> bool:
    if raw is None:
        return False
    return raw.strip().lower() in ("true", "1", "on", "yes")


def _document_attachment_headers(filename: str) -> dict[str, str]:
    safe = filename.replace("\r", " ").replace("\n", " ").strip() or "document"
    ascii_name = safe.encode("ascii", "replace").decode("ascii").replace('"', "'")[:200]
    disp = f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(safe)}"
    return {"Content-Disposition": disp}


@router.get("/me/documents", response_model=ProfileDocumentsListOut)
def list_profile_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileDocumentsListOut:
    db.refresh(user)
    rows = (
        db.query(UserProfileDocument)
        .filter(UserProfileDocument.user_id == user.id)
        .order_by(UserProfileDocument.created_at.desc())
        .all()
    )
    items = [ProfileDocumentOut.model_validate(r) for r in rows]
    return ProfileDocumentsListOut(
        items=items,
        storage_consent_covered=_profile_docs_storage_covered(db, user),
    )


@router.post("/me/documents", response_model=ProfileDocumentUploadOut)
@limiter.limit("10/minute", key_func=user_or_ip_key)
async def upload_profile_document(
    request: Request,
    file: UploadFile = File(...),
    processing_consent: str = Form(default="false"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileDocumentUploadOut:
    settings = get_settings()
    db.refresh(user)
    if not _profile_docs_storage_covered(db, user):
        if not _form_bool_flag(processing_consent):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Storing profile documents requires explicit consent (see Privacy Policy), "
                    "unless you already accepted CV storage."
                ),
            )
        user.profile_documents_processing_consent_at = datetime.now(timezone.utc)
        db.add(user)
        db.flush()

    count = db.query(UserProfileDocument).filter(UserProfileDocument.user_id == user.id).count()
    if count >= settings.profile_documents_max_per_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum number of stored documents reached.",
        )

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing filename")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    max_bytes = settings.profile_document_max_bytes
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (max {max_bytes // (1024 * 1024)} MB).",
        )

    try:
        validate_profile_document_filename(file.filename)
        orig_safe = safe_original_filename(file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    ct = (file.content_type or "").strip()[:128] or None
    storage_path: str
    try:
        storage_path = write_profile_document_file(
            user_id=user.id, content=content, original_filename=file.filename
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    doc = UserProfileDocument(
        user_id=user.id,
        original_filename=orig_safe,
        storage_path=storage_path,
        content_type=ct,
        size_bytes=len(content),
    )
    db.add(doc)
    try:
        db.commit()
    except Exception:
        db.rollback()
        delete_profile_document_file(storage_path)
        raise
    db.refresh(doc)
    return ProfileDocumentUploadOut(
        document=ProfileDocumentOut.model_validate(doc),
        message="File stored.",
    )


@router.get("/me/documents/{document_id}/file")
def download_profile_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    doc = (
        db.query(UserProfileDocument)
        .filter(UserProfileDocument.id == document_id, UserProfileDocument.user_id == user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        body = read_profile_document_bytes(doc.storage_path)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="File missing on server",
        ) from exc
    return Response(
        content=body,
        media_type=doc.content_type or "application/octet-stream",
        headers=_document_attachment_headers(doc.original_filename),
    )


@router.delete("/me/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    doc = (
        db.query(UserProfileDocument)
        .filter(UserProfileDocument.id == document_id, UserProfileDocument.user_id == user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    delete_profile_document_file(doc.storage_path)
    db.delete(doc)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/evidence", response_model=CandidateEvidenceListOut)
def list_my_evidence_items(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateEvidenceListOut:
    candidate = _get_candidate_or_404(db, user.id)
    payload = list_candidate_evidence_items(db, candidate_id=candidate.id)
    return CandidateEvidenceListOut(
        items=[CandidateEvidenceItemOut.model_validate(i) for i in payload["items"]],
        total=payload["total"],
    )


@router.post("/me/evidence", response_model=CandidateEvidenceItemOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute", key_func=user_or_ip_key)
def create_my_evidence_item(
    request: Request,
    body: CandidateEvidenceItemIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateEvidenceItemOut:
    candidate = _get_candidate_or_404(db, user.id)
    try:
        row = create_candidate_evidence_item(
            db,
            candidate_id=candidate.id,
            skill_name=body.skill_name,
            evidence_type=body.evidence_type,
            title=body.title,
            note=body.note,
            source_url=body.source_url,
            privacy_class=body.privacy_class,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return CandidateEvidenceItemOut.model_validate(row)


@router.delete("/me/evidence/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_evidence_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    candidate = _get_candidate_or_404(db, user.id)
    try:
        delete_candidate_evidence_item(db, candidate_id=candidate.id, item_id=item_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/cv/tailor", response_model=CvTailoringOut)
def tailor_cv_for_role(
    body: CvTailorIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CvTailoringOut:
    candidate = _get_candidate_or_404(db, user.id)
    cv_text = (candidate.cv_text or "").strip()
    if not cv_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload a CV first — tailoring uses your CV text.",
        )
    job: Job | None = None
    if body.job_id is not None:
        job = db.query(Job).filter(Job.id == body.job_id).first()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    company: str | None = job.company if job else None
    job_ctx: str | None = None
    if job:
        chunks = [job.title or "", job.company or "", job.description or "", job.requirements or ""]
        job_ctx = "\n\n".join(c for c in chunks if c).strip()[:12_000] or None
    try:
        blob = build_cv_tailoring_blob(
            candidate.cv_text,
            target_job_title=body.target_job_title,
            job_id=body.job_id,
            company=company,
            job_context=job_ctx,
            locale=locale_from_request(request),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    signals: dict[str, Any] = {}
    if candidate.profile_signals_json:
        try:
            parsed = json.loads(candidate.profile_signals_json)
            signals = parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            signals = {}
    signals["cv_tailoring"] = blob
    candidate.profile_signals_json = json.dumps(signals)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return CvTailoringOut(
        message="Tailoring saved — auto-apply will use it for matching motivation fields when applicable.",
        tailoring=blob,
    )


@router.delete("/me/cv/tailoring", response_model=CandidateOut)
def remove_cv_tailoring(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CandidateOut:
    candidate = _get_candidate_or_404(db, user.id)
    signals: dict[str, Any] = {}
    if candidate.profile_signals_json:
        try:
            parsed = json.loads(candidate.profile_signals_json)
            signals = parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            signals = {}
    signals.pop("cv_tailoring", None)
    candidate.profile_signals_json = json.dumps(signals) if signals else None
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _to_out(db, candidate)


@router.get("/me/acceptance-queue", response_model=AcceptanceQueueOut)
def get_acceptance_queue(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AcceptanceQueueOut:
    """Short list of acceptance-ready interviews and high-fit matches (north star)."""
    candidate = _get_candidate_or_404(db, user.id)
    payload = build_acceptance_queue(db, candidate)
    return AcceptanceQueueOut(**payload)


@router.post("/me/acceptance-queue/{item_id}/respond")
def respond_acceptance_queue_item(
    item_id: int,
    body: AcceptanceRespondIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    candidate = _get_candidate_or_404(db, user.id)
    try:
        return respond_acceptance_item(
            db,
            candidate,
            kind=body.kind,
            item_id=item_id,
            action=body.action,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/me/matches", response_model=JobMatchListOut)
def get_my_matches(
    request: Request,
    limit: int = Query(10, ge=1, le=400),
    min_score: float = Query(40.0, ge=0, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobMatchListOut:
    candidate = _get_candidate_or_404(db, user.id)
    loc = locale_from_request(request)
    rows = find_top_matches(db, candidate, limit=limit, min_score=min_score, locale=loc)
    items = [JobMatchOut(**row) for row in rows]
    return JobMatchListOut(items=items, total=len(items))


@router.get("/me/match-feedback", response_model=JobMatchFeedbackListOut)
def list_my_match_feedback(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobMatchFeedbackListOut:
    candidate = _get_candidate_or_404(db, user.id)
    rows = (
        db.query(JobMatchFeedback)
        .filter(JobMatchFeedback.candidate_id == candidate.id)
        .order_by(JobMatchFeedback.updated_at.desc())
        .all()
    )
    items = [
        JobMatchFeedbackOut(
            job_id=row.job_id,
            feedback_value=row.feedback_value,
            updated_at=row.updated_at,
        )
        for row in rows
    ]
    return JobMatchFeedbackListOut(items=items)


@router.post("/me/match-feedback", response_model=JobMatchFeedbackOut, status_code=201)
@limiter.limit("60/minute", key_func=user_or_ip_key)
def submit_match_feedback(
    request: Request,
    body: JobMatchFeedbackIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobMatchFeedbackOut:
    candidate = _get_candidate_or_404(db, user.id)
    job = db.query(Job).filter(Job.id == body.job_id).first()
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found")
    try:
        row = upsert_feedback(
            db,
            candidate_id=candidate.id,
            job_id=body.job_id,
            feedback_value=body.feedback_value,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return JobMatchFeedbackOut(
        job_id=row.job_id,
        feedback_value=row.feedback_value,
        updated_at=row.updated_at,
    )


@router.get("/me/matches/export.csv")
def export_my_matches_csv(
    limit: int = Query(200, ge=1, le=400),
    min_score: float = Query(38.0, ge=0, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    """CSV export of current ranked matches (same scoring window as the dashboard list)."""
    candidate = _get_candidate_or_404(db, user.id)
    rows = find_top_matches(db, candidate, limit=limit, min_score=min_score)
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(["job_id", "score", "title", "company", "location", "job_board", "url"])
    for row in rows:
        writer.writerow(
            [
                row["job_id"],
                round(float(row["score"]), 2),
                row["title"],
                row["company"],
                row.get("location") or "",
                row["job_board"],
                row["url"],
            ],
        )
    return Response(
        content=buf.getvalue().encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="twin-matches.csv"'},
    )


@router.get("/me/matches/export.xlsx")
def export_my_matches_xlsx(
    limit: int = Query(200, ge=1, le=400),
    min_score: float = Query(38.0, ge=0, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    """Excel (.xlsx) export of ranked matches — same rows as export.csv."""
    candidate = _get_candidate_or_404(db, user.id)
    rows = find_top_matches(db, candidate, limit=limit, min_score=min_score)
    wb = Workbook()
    ws = wb.active
    assert ws is not None
    ws.title = "Matches"
    ws.append(["job_id", "score", "title", "company", "location", "job_board", "url"])
    for row in rows:
        ws.append(
            [
                row["job_id"],
                round(float(row["score"]), 2),
                row["title"],
                row["company"],
                row.get("location") or "",
                row["job_board"],
                row["url"],
            ],
        )
    out = BytesIO()
    wb.save(out)
    out.seek(0)
    return Response(
        content=out.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="twin-matches.xlsx"'},
    )


@router.get("/me/export.json")
def export_my_data_json(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JSONResponse:
    """Machine-readable export of account and profile data owned by the signed-in user (GDPR-style portability)."""
    settings = get_settings()
    dashboard_url = f"{settings.frontend_url.rstrip('/')}/dashboard"
    row = db.query(User).filter(User.id == user.id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    body = build_user_owned_export_payload(db=db, user=row, dashboard_url=dashboard_url)
    return JSONResponse(
        content=body,
        headers={"Content-Disposition": 'attachment; filename="twin-my-data.json"'},
    )


@router.get("/me/career-compass", response_model=CareerCompassOut)
def get_career_compass(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CareerCompassOut:
    candidate = _get_candidate_or_404(db, user.id)
    row = get_compass_row(db, candidate_id=candidate.id)
    return CareerCompassOut.model_validate(serialize_compass(row))


@router.put("/me/career-compass", response_model=CareerCompassOut)
def put_career_compass(
    body: CareerCompassPutIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CareerCompassOut:
    candidate = _get_candidate_or_404(db, user.id)
    payload = body.model_dump(exclude_unset=False)
    try:
        data = upsert_compass(db, candidate_id=candidate.id, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return CareerCompassOut.model_validate(data)


@router.patch("/me/career-compass", response_model=CareerCompassOut)
def patch_career_compass(
    body: CareerCompassPatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CareerCompassOut:
    candidate = _get_candidate_or_404(db, user.id)
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        row = get_compass_row(db, candidate_id=candidate.id)
        return CareerCompassOut.model_validate(serialize_compass(row))
    try:
        data = patch_compass(db, candidate_id=candidate.id, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return CareerCompassOut.model_validate(data)


@router.get("/me/trust", response_model=TrustCenterOut)
def get_trust_center(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TrustCenterOut:
    candidate = _get_candidate_or_404(db, user.id)
    row = db.query(User).filter(User.id == user.id).first()
    assert row is not None
    return TrustCenterOut.model_validate(build_trust_center(db, candidate=candidate, user=row))


@router.get("/me/consents", response_model=ConsentListOut)
def get_consents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ConsentListOut:
    candidate = _get_candidate_or_404(db, user.id)
    row = db.query(User).filter(User.id == user.id).first()
    assert row is not None
    return ConsentListOut.model_validate(list_consents(db, candidate=candidate, user=row))


@router.post("/me/consents", response_model=ConsentListOut, status_code=201)
def post_consent(
    body: ConsentGrantIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ConsentListOut:
    candidate = _get_candidate_or_404(db, user.id)
    row = db.query(User).filter(User.id == user.id).first()
    assert row is not None
    try:
        data = grant_consent(
            db,
            candidate=candidate,
            user=row,
            purpose=body.purpose,
            idempotency_key=body.idempotency_key,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return ConsentListOut.model_validate(data)


@router.patch("/me/consents", response_model=ConsentListOut)
def patch_consents(
    body: ConsentPatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ConsentListOut:
    candidate = _get_candidate_or_404(db, user.id)
    row = db.query(User).filter(User.id == user.id).first()
    assert row is not None
    try:
        data = patch_consent(
            db,
            candidate=candidate,
            user=row,
            purpose=body.purpose,
            action=body.action,
            idempotency_key=body.idempotency_key,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return ConsentListOut.model_validate(data)


@router.get("/me/consent-receipts", response_model=ConsentReceiptListOut)
def get_consent_receipts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> ConsentReceiptListOut:
    candidate = _get_candidate_or_404(db, user.id)
    return ConsentReceiptListOut.model_validate(
        list_consent_receipts(db, candidate_id=candidate.id, limit=limit, offset=offset)
    )


@router.get("/me/privacy-requests", response_model=PrivacyRequestListOut)
def get_privacy_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> PrivacyRequestListOut:
    candidate = _get_candidate_or_404(db, user.id)
    return PrivacyRequestListOut.model_validate(
        list_privacy_requests(db, candidate_id=candidate.id, limit=limit, offset=offset)
    )


@router.post("/me/privacy-requests", response_model=PrivacyRequestOut, status_code=201)
def post_privacy_request(
    body: PrivacyRequestCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PrivacyRequestOut:
    candidate = _get_candidate_or_404(db, user.id)
    try:
        data = create_privacy_request(
            db,
            candidate_id=candidate.id,
            user_id=user.id,
            request_type=body.request_type,
            payload=body.payload,
            idempotency_key=body.idempotency_key,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return PrivacyRequestOut.model_validate(data)


@router.get("/me/privacy-requests/{request_id}", response_model=PrivacyRequestOut)
def get_privacy_request_by_id(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PrivacyRequestOut:
    candidate = _get_candidate_or_404(db, user.id)
    data = get_privacy_request(db, candidate_id=candidate.id, request_id=request_id)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Privacy request not found")
    return PrivacyRequestOut.model_validate(data)


@router.post("/me/privacy-requests/{request_id}/cancel", response_model=PrivacyRequestOut)
def cancel_privacy_request_endpoint(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PrivacyRequestOut:
    candidate = _get_candidate_or_404(db, user.id)
    try:
        data = cancel_privacy_request(
            db,
            candidate_id=candidate.id,
            request_id=request_id,
            user_id=user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return PrivacyRequestOut.model_validate(data)


@router.post("/me/delete-account", response_model=AccountDeleteOut)
@limiter.limit("3/minute", key_func=user_or_ip_key)
def delete_my_account(
    request: Request,
    body: AccountDeleteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AccountDeleteOut:
    """Self-service account deletion — anonymizes PII and deactivates sign-in (R-019)."""
    candidate = _get_candidate_or_404(db, user.id)
    try:
        data = execute_candidate_account_deletion(
            db,
            user=user,
            candidate=candidate,
            confirmation=body.confirmation,
            idempotency_key=body.idempotency_key,
        )
    except ValueError as exc:
        detail = str(exc)
        code = status.HTTP_409_CONFLICT if "already deleted" in detail.lower() else status.HTTP_422_UNPROCESSABLE_ENTITY
        raise HTTPException(status_code=code, detail=detail) from exc
    return AccountDeleteOut.model_validate(data)


@router.get("/me/trust/audit-events", response_model=TrustAuditEventListOut)
def get_trust_audit_events(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> TrustAuditEventListOut:
    candidate = _get_candidate_or_404(db, user.id)
    return TrustAuditEventListOut.model_validate(
        list_trust_audit_events(db, candidate_id=candidate.id, limit=limit, offset=offset)
    )


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
    now = datetime.now(timezone.utc)
    pool_at: datetime | None = None
    if opt_in_default and getattr(body, "talent_pool_processing_consent", False) is True:
        pool_at = now
    return Candidate(
        user_id=user_id,
        name=body.name,
        skills=json.dumps(body.skills),
        preferred_job_titles=json.dumps(_normalize_titles(body)),
        experience_years=body.experience_years,
        desired_salary=body.desired_salary,
        location=body.location,
        talent_pool_opt_in=opt_in_default,
        talent_pool_opt_in_at=pool_at,
    )


def _apply_update(candidate: Candidate, body: CandidateUpdate) -> None:
    candidate.name = body.name
    candidate.skills = json.dumps(body.skills)
    candidate.preferred_job_titles = json.dumps(_normalize_titles(body))
    candidate.experience_years = body.experience_years
    candidate.desired_salary = body.desired_salary
    candidate.location = body.location
    if body.talent_pool_opt_in is not None:
        prev = candidate.talent_pool_opt_in
        if body.talent_pool_opt_in:
            if not prev and not body.talent_pool_processing_consent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Talent pool opt-in requires explicit consent on the same save (see Privacy Policy).",
                )
            candidate.talent_pool_opt_in = True
            candidate.talent_pool_opt_in_at = datetime.now(timezone.utc)
        else:
            candidate.talent_pool_opt_in = False
            candidate.talent_pool_opt_in_at = None
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


def _cv_tailoring_from_candidate(candidate: Candidate) -> dict[str, Any] | None:
    if not candidate.profile_signals_json:
        return None
    try:
        blob = json.loads(candidate.profile_signals_json)
    except json.JSONDecodeError:
        return None
    if not isinstance(blob, dict):
        return None
    raw = blob.get("cv_tailoring")
    return raw if isinstance(raw, dict) else None


def _signals_dict(candidate: Candidate) -> dict[str, Any]:
    if not candidate.profile_signals_json:
        return {}
    try:
        d = json.loads(candidate.profile_signals_json)
        return d if isinstance(d, dict) else {}
    except json.JSONDecodeError:
        return {}


def _career_compass_preview_for_out(db: Session, candidate: Candidate) -> CareerCompassPreviewOut | None:
    row = get_compass_row(db, candidate_id=candidate.id)
    if row is None:
        return None
    data = serialize_compass(row)
    if not data.get("configured"):
        return None
    next_steps = data.get("next_steps") or []
    next_title = str(next_steps[0]).strip()[:200] if next_steps else None
    return CareerCompassPreviewOut(
        configured=True,
        completion_percent=int(data.get("completion_percent") or 0),
        readiness_complete=bool(data.get("readiness_complete")),
        next_step_title=next_title,
    )


def _to_out(db: Session, candidate: Candidate) -> CandidateOut:
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
        talent_pool_opt_in_at=candidate.talent_pool_opt_in_at,
        has_cv=candidate_has_cv(candidate),
        cv_filename=candidate.cv_filename,
        cv_uploaded_at=candidate.cv_uploaded_at,
        has_intro_audio=bool(candidate.intro_audio_path),
        intro_audio_uploaded_at=candidate.intro_audio_uploaded_at,
        cv_insights=_cv_insights_from_candidate(candidate),
        cv_processing_consent_at=candidate.cv_processing_consent_at,
        intro_audio_processing_consent_at=candidate.intro_audio_processing_consent_at,
        cv_tailoring=_cv_tailoring_from_candidate(candidate),
        career_compass_preview=_career_compass_preview_for_out(db, candidate),
    )
