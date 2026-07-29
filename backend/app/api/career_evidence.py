"""Career Evidence & Portfolio API — source-backed, private by default."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, CandidateEvidenceField, User
from app.services import career_evidence as ce
from app.services import career_copilot as cc

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create your profile first")
    return row


class SourceIn(BaseModel):
    source_kind: str = Field(..., max_length=64)
    title: str = Field(..., min_length=1, max_length=300)
    content_text: str | None = Field(default=None, max_length=200_000)
    location_ref: str | None = Field(default=None, max_length=500)
    mime_type: str | None = Field(default="text/plain", max_length=120)
    is_synthetic: bool = False


class ExtractIn(BaseModel):
    source_id: int
    text: str = Field(..., min_length=1, max_length=200_000)


class EvidenceIn(BaseModel):
    evidence_type: str = Field(default="custom", max_length=64)
    title: str = Field(..., min_length=2, max_length=300)
    summary: str = Field(default="", max_length=4000)
    source_ids: list[int] = Field(default_factory=list)
    claim_kind: str = Field(default="UNKNOWN", max_length=32)
    skills: list[str] = Field(default_factory=list)
    metrics: list[dict] = Field(default_factory=list)
    confidentiality: str = Field(default="PRIVATE", max_length=40)
    context: dict | None = None
    action: dict | None = None
    result: dict | None = None


class FieldActionIn(BaseModel):
    action: str = Field(..., pattern="^(confirm|partial|reject|dispute|redact|edit)$")
    edited_value: str | None = None


class SkillLinkIn(BaseModel):
    evidence_id: int
    skill: str = Field(..., min_length=1, max_length=120)
    link_state: str = Field(default="CLAIM_ONLY", max_length=40)


class AchievementIn(BaseModel):
    framework: str = Field(default="CAR", max_length=16)
    title: str = Field(..., min_length=2, max_length=300)
    parts: dict = Field(default_factory=dict)
    source_ids: list[int] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)


class ProjectIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    body: dict = Field(default_factory=dict)
    evidence_ids: list[int] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    confidentiality: str = Field(default="PRIVATE", max_length=40)
    as_case_study: bool = False


class StoryIn(BaseModel):
    theme: str = Field(..., max_length=64)
    title: str = Field(..., min_length=2, max_length=300)
    body: dict = Field(default_factory=dict)
    evidence_ids: list[int] = Field(default_factory=list)
    framework: str = Field(default="STAR", max_length=16)


class BulletAuditIn(BaseModel):
    bullet: str = Field(..., min_length=2, max_length=4000)
    evidence_ids: list[int] = Field(default_factory=list)


class BulletFromEvidenceIn(BaseModel):
    evidence_id: int
    target_role: str | None = Field(default=None, max_length=200)


class PackIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    requirements: list[str] = Field(default_factory=list)
    application_id: int | None = None


class ConflictResolveIn(BaseModel):
    resolution: str = Field(..., pattern="^(keep_separate|supersede|archive_duplicate|needs_review)$")


class PrivacyIn(BaseModel):
    ai_extraction_opt_in: bool | None = None
    drafting_opt_in: bool | None = None
    memory_reuse_opt_in: bool | None = None
    portfolio_inclusion_default: str | None = None
    export_include_confidential: bool | None = None
    paused: bool | None = None


@router.get("/me/career-evidence")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return ce.build_career_evidence_aggregate(db, candidate_id=cand.id, user_id=user.id)


@router.get("/me/portfolio")
def get_portfolio(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    agg = ce.build_career_evidence_aggregate(db, candidate_id=cand.id, user_id=user.id)
    return {
        "schema": "twin.private_portfolio/v1",
        "is_public": False,
        "public_url": None,
        "projects": agg["projects"],
        "stories": agg["stories"],
        "evidence": agg["evidence"],
        "readiness": agg["readiness"],
        "safety": agg["safety"],
        "alembic": agg["alembic"],
    }


@router.post("/me/career-evidence/sources", status_code=status.HTTP_201_CREATED)
def post_source(
    body: SourceIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ce.register_source(
            db,
            candidate_id=cand.id,
            source_kind=body.source_kind,
            title=cc.scrub_prompt_injection(body.title),
            content=body.content_text,
            location_ref=body.location_ref,
            mime_type=body.mime_type,
            is_synthetic=body.is_synthetic or bool(getattr(user, "exclude_from_product_metrics", False)),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"source": ce._ser_source(row)}


@router.post("/me/career-evidence/extract")
def post_extract(
    body: ExtractIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        items = ce.extract_from_text(
            db,
            candidate_id=cand.id,
            source_id=body.source_id,
            text=body.text,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    fields = (
        db.query(CandidateEvidenceField)
        .filter(
            CandidateEvidenceField.candidate_id == cand.id,
            CandidateEvidenceField.evidence_id.in_([i.id for i in items] or [-1]),
        )
        .all()
        if items
        else []
    )
    return {
        "extracted": [ce._ser_evidence(i) for i in items],
        "fields": [
            {
                "id": f.id,
                "evidence_id": f.evidence_id,
                "field_name": f.field_name,
                "confirmation": f.confirmation,
                "claim_kind": f.claim_kind,
                "source_location": f.source_location,
            }
            for f in fields
        ],
        "invented_metrics": False,
    }


@router.post("/me/career-evidence/items", status_code=status.HTTP_201_CREATED)
def post_evidence(
    body: EvidenceIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ce.create_evidence(
            db,
            candidate_id=cand.id,
            evidence_type=body.evidence_type,
            title=cc.scrub_prompt_injection(body.title),
            summary=cc.scrub_prompt_injection(body.summary or ""),
            source_ids=body.source_ids,
            claim_kind=body.claim_kind,
            skills=body.skills,
            metrics=body.metrics,
            confidentiality=body.confidentiality,
            context=body.context,
            action=body.action,
            result=body.result,
            is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"evidence": ce._ser_evidence(row)}


@router.post("/me/career-evidence/fields/{field_id}/action")
def field_action(
    field_id: int,
    body: FieldActionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ce.confirm_field(
            db,
            candidate_id=cand.id,
            field_id=field_id,
            action=body.action,
            edited_value=body.edited_value,
        )
    except ValueError as exc:
        code = status.HTTP_404_NOT_FOUND if "not_found" in str(exc) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(code, detail=str(exc)) from exc
    return {
        "field": {
            "id": row.id,
            "confirmation": row.confirmation,
            "claim_kind": row.claim_kind,
            "version": row.version,
        }
    }


@router.post("/me/career-evidence/skills/link", status_code=status.HTTP_201_CREATED)
def post_skill_link(
    body: SkillLinkIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = ce.link_skill(
        db,
        candidate_id=cand.id,
        evidence_id=body.evidence_id,
        skill=body.skill,
        link_state=body.link_state,
    )
    return {
        "link": {
            "id": row.id,
            "skill": row.skill,
            "link_state": row.link_state,
            "mastery_claim": False,
        }
    }


@router.post("/me/career-evidence/achievements", status_code=status.HTTP_201_CREATED)
def post_achievement(
    body: AchievementIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = ce.build_achievement(
        db,
        candidate_id=cand.id,
        framework=body.framework,
        title=cc.scrub_prompt_injection(body.title),
        parts=body.parts,
        source_ids=body.source_ids,
        skills=body.skills,
    )
    return {"evidence": ce._ser_evidence(row)}


@router.post("/me/career-evidence/{evidence_id}/redact", status_code=status.HTTP_201_CREATED)
def post_redact(
    evidence_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ce.create_redacted_variant(db, candidate_id=cand.id, evidence_id=evidence_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"evidence": ce._ser_evidence(row), "original_preserved": True}


@router.post("/me/portfolio/projects", status_code=status.HTTP_201_CREATED)
def post_project(
    body: ProjectIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        if body.as_case_study:
            row = ce.create_case_study(
                db,
                candidate_id=cand.id,
                title=cc.scrub_prompt_injection(body.title),
                body=body.body,
                evidence_ids=body.evidence_ids,
            )
        else:
            row = ce.create_portfolio_project(
                db,
                candidate_id=cand.id,
                title=cc.scrub_prompt_injection(body.title),
                body=body.body,
                evidence_ids=body.evidence_ids,
                skills=body.skills,
                confidentiality=body.confidentiality,
            )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"project": ce._ser_project(row), "is_public": False}


@router.post("/me/career-evidence/stories", status_code=status.HTTP_201_CREATED)
def post_story(
    body: StoryIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ce.create_interview_story(
            db,
            candidate_id=cand.id,
            theme=body.theme,
            title=cc.scrub_prompt_injection(body.title),
            body=body.body,
            evidence_ids=body.evidence_ids,
            framework=body.framework,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"story": ce._ser_story(row)}


@router.post("/me/career-evidence/cv/audit", status_code=status.HTTP_201_CREATED)
def post_cv_audit(
    body: BulletAuditIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = ce.audit_cv_bullet(
        db, candidate_id=cand.id, bullet=body.bullet, evidence_ids=body.evidence_ids
    )
    return {
        "bullet": {
            "id": row.id,
            "audit_status": row.audit_status,
            "draft_text": row.draft_text,
            "claim_kind": row.claim_kind,
        }
    }


@router.post("/me/career-evidence/cv/bullet-from-evidence", status_code=status.HTTP_201_CREATED)
def post_bullet_from_evidence(
    body: BulletFromEvidenceIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ce.build_cv_bullet_from_evidence(
            db,
            candidate_id=cand.id,
            evidence_id=body.evidence_id,
            target_role=body.target_role,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "bullet": {
            "id": row.id,
            "draft_text": row.draft_text,
            "audit_status": row.audit_status,
            "canonical_cv_rewritten": False,
        }
    }


@router.post("/me/career-evidence/packs", status_code=status.HTTP_201_CREATED)
def post_pack(
    body: PackIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = ce.build_application_pack(
        db,
        candidate_id=cand.id,
        title=cc.scrub_prompt_injection(body.title),
        requirements=body.requirements,
        application_id=body.application_id,
    )
    return {
        "pack": {
            "id": row.id,
            "fit_kind": row.fit_kind,
            "auto_submit": False,
            "gaps": ce._loads(row.gaps_json, []),
        }
    }


@router.post("/me/career-evidence/conflicts/scan")
def scan_conflicts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"conflicts": ce.detect_conflicts(db, candidate_id=cand.id), "auto_resolved": False}


@router.post("/me/career-evidence/conflicts/{claim_id}/resolve")
def resolve_conflict(
    claim_id: int,
    body: ConflictResolveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = ce.resolve_conflict(
            db, candidate_id=cand.id, claim_id=claim_id, resolution=body.resolution
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"claim": {"id": row.id, "status": row.status, "consistency": row.consistency}}


@router.patch("/me/career-evidence/privacy")
def patch_privacy(
    body: PrivacyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = ce.update_privacy(
        db,
        candidate_id=cand.id,
        ai_extraction_opt_in=body.ai_extraction_opt_in,
        drafting_opt_in=body.drafting_opt_in,
        memory_reuse_opt_in=body.memory_reuse_opt_in,
        portfolio_inclusion_default=body.portfolio_inclusion_default,
        export_include_confidential=body.export_include_confidential,
        paused=body.paused,
    )
    return {
        "privacy": {
            "ai_extraction_opt_in": row.ai_extraction_opt_in,
            "paused": row.paused,
            "export_include_confidential": row.export_include_confidential,
            "version": row.version,
        }
    }


@router.get("/me/career-evidence/export")
def export_evidence(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return ce.export_evidence(db, candidate_id=cand.id)


@router.post("/me/career-evidence/history/delete")
def delete_evidence(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return ce.delete_all_evidence(db, candidate_id=cand.id)


@router.get("/me/career-evidence/readiness")
def get_readiness(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return ce.readiness_dimensions(db, candidate_id=cand.id)
