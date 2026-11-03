"""Interview & Decision Copilot API — prep/practice/decide; never covert or external acts."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import career_copilot as cc
from app.services import interview_decision as idc

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create your profile first")
    return row


class ProcessIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    company: str = Field(default="UNKNOWN", max_length=300)
    role_title: str = Field(default="UNKNOWN", max_length=300)
    workspace_id: int | None = None
    application_id: int | None = None


class StageIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    stage_kind: str = Field(default="screen", max_length=64)


class AnswerIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)
    evidence_ids: list[int] = Field(default_factory=list)
    story_ids: list[int] = Field(default_factory=list)
    answer_text: str = Field(default="", max_length=8000)
    stage_id: int | None = None
    likelihood: str = Field(default="POSSIBLE", max_length=32)


class ApproveIn(BaseModel):
    answer_id: int
    approved: bool = True


class EventIn(BaseModel):
    recollection: dict[str, Any] = Field(default_factory=dict)
    stage_id: int | None = None
    transcript: dict[str, Any] | None = None


class FeedbackIn(BaseModel):
    employer_raw: dict[str, Any] = Field(default_factory=dict)
    candidate_interpretation: dict[str, Any] = Field(default_factory=dict)


class OfferIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    company: str = Field(default="UNKNOWN", max_length=300)
    terms: dict[str, Any] = Field(default_factory=dict)
    provenance: str = Field(default="candidate_declared", max_length=64)
    process_id: int | None = None


class CompareIn(BaseModel):
    offer_ids: list[int] = Field(default_factory=list)


class MemoIn(BaseModel):
    process_id: int | None = None
    offer_id: int | None = None
    criteria: list[dict[str, Any]] | None = None


class DeclareIn(BaseModel):
    decision: str = Field(..., max_length=64)
    notes: str = Field(default="", max_length=2000)


class PrivacyIn(BaseModel):
    ai_prep_opt_in: bool | None = None
    transcript_retention_opt_in: bool | None = None
    export_include_transcripts: bool | None = None
    paused: bool | None = None


@router.get("/me/interview-decision")
def get_aggregate(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return idc.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/interview-decision/processes", status_code=status.HTTP_201_CREATED)
def post_process(
    body: ProcessIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = idc.create_process(
            db,
            candidate_id=cand.id,
            title=cc.scrub_prompt_injection(body.title),
            company=cc.scrub_prompt_injection(body.company),
            role_title=cc.scrub_prompt_injection(body.role_title),
            workspace_id=body.workspace_id,
            application_id=body.application_id,
            is_synthetic=bool(getattr(user, "exclude_from_product_metrics", False)),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"process": idc._ser_process(row)}


@router.get("/me/interview-decision/processes/{process_id}")
def get_process(
    process_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = idc._process(db, candidate_id=cand.id, process_id=process_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {
        "process": idc._ser_process(row),
        "snapshot_integrity": idc.assert_snapshot_immutable(
            db, candidate_id=cand.id, process_id=process_id
        ),
    }


@router.get("/me/interview-decision/processes/{process_id}/snapshot-integrity")
def get_snapshot_integrity(
    process_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return idc.assert_snapshot_immutable(db, candidate_id=cand.id, process_id=process_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/me/interview-decision/processes/{process_id}/stages", status_code=status.HTTP_201_CREATED)
def post_stage(
    process_id: int,
    body: StageIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        stage = idc.add_stage(
            db,
            candidate_id=cand.id,
            process_id=process_id,
            name=cc.scrub_prompt_injection(body.name),
            stage_kind=body.stage_kind,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"stage": idc._ser_stage(stage)}


@router.post("/me/interview-decision/processes/{process_id}/answers", status_code=status.HTTP_201_CREATED)
def post_answer(
    process_id: int,
    body: AnswerIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        ans = idc.build_answer(
            db,
            candidate_id=cand.id,
            process_id=process_id,
            question=cc.scrub_prompt_injection(body.question),
            evidence_ids=body.evidence_ids,
            story_ids=body.story_ids,
            answer_text=cc.scrub_prompt_injection(body.answer_text or ""),
            stage_id=body.stage_id,
            likelihood=body.likelihood,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"answer": idc._ser_answer(ans)}


@router.post("/me/interview-decision/processes/{process_id}/answers/approve")
def post_approve(
    process_id: int,
    body: ApproveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return idc.approve_answer(
            db,
            candidate_id=cand.id,
            process_id=process_id,
            answer_id=body.answer_id,
            approved=body.approved,
        )
    except ValueError as exc:
        code = status.HTTP_404_NOT_FOUND if "not_found" in str(exc) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(code, detail=str(exc)) from exc


@router.post("/me/interview-decision/processes/{process_id}/mocks", status_code=status.HTTP_201_CREATED)
def post_mock(
    process_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        mock = idc.run_mock(db, candidate_id=cand.id, process_id=process_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"mock": idc._ser_mock(mock)}


@router.post("/me/interview-decision/processes/{process_id}/events", status_code=status.HTTP_201_CREATED)
def post_event(
    process_id: int,
    body: EventIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        evt = idc.record_event(
            db,
            candidate_id=cand.id,
            process_id=process_id,
            recollection=body.recollection,
            stage_id=body.stage_id,
            transcript=body.transcript,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"event": idc._ser_event(evt)}


@router.post("/me/interview-decision/processes/{process_id}/feedback", status_code=status.HTTP_201_CREATED)
def post_feedback(
    process_id: int,
    body: FeedbackIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        fb = idc.capture_feedback(
            db,
            candidate_id=cand.id,
            process_id=process_id,
            employer_raw=body.employer_raw,
            candidate_interpretation=body.candidate_interpretation,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"feedback": idc._ser_feedback(fb)}


@router.post("/me/interview-decision/offers", status_code=status.HTTP_201_CREATED)
def post_offer(
    body: OfferIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        offer = idc.register_offer(
            db,
            candidate_id=cand.id,
            process_id=body.process_id,
            title=cc.scrub_prompt_injection(body.title),
            company=cc.scrub_prompt_injection(body.company),
            terms=body.terms,
            provenance=body.provenance,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"offer": idc._ser_offer(offer)}


@router.post("/me/interview-decision/offers/compare")
def post_compare(
    body: CompareIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return idc.compare_offers(db, candidate_id=cand.id, offer_ids=body.offer_ids)


@router.post("/me/interview-decision/memos", status_code=status.HTTP_201_CREATED)
def post_memo(
    body: MemoIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    memo = idc.create_decision_memo(
        db,
        candidate_id=cand.id,
        process_id=body.process_id,
        offer_id=body.offer_id,
        criteria=body.criteria,
    )
    return {"memo": idc._ser_memo(memo)}


@router.post("/me/interview-decision/memos/{memo_id}/declare")
def post_declare(
    memo_id: int,
    body: DeclareIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        memo = idc.declare_decision(
            db,
            candidate_id=cand.id,
            memo_id=memo_id,
            decision=body.decision,
            notes=body.notes,
        )
    except ValueError as exc:
        code = status.HTTP_404_NOT_FOUND if "not_found" in str(exc) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(code, detail=str(exc)) from exc
    return {"memo": idc._ser_memo(memo)}


@router.get("/me/interview-decision/processes/{process_id}/export")
def get_export(
    process_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return idc.export_process(db, candidate_id=cand.id, process_id=process_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/me/interview-decision/processes/{process_id}/delete")
def post_delete(
    process_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return idc.delete_process(db, candidate_id=cand.id, process_id=process_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/me/interview-decision/privacy")
def patch_privacy(
    body: PrivacyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = idc.update_privacy(
        db,
        candidate_id=cand.id,
        ai_prep_opt_in=body.ai_prep_opt_in,
        transcript_retention_opt_in=body.transcript_retention_opt_in,
        export_include_transcripts=body.export_include_transcripts,
        paused=body.paused,
    )
    return {
        "privacy": {
            "ai_prep_opt_in": row.ai_prep_opt_in,
            "transcript_retention_opt_in": row.transcript_retention_opt_in,
            "export_include_transcripts": row.export_include_transcripts,
            "paused": row.paused,
        }
    }
