"""AI career assistant API (US-C052–057)."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.session import get_db
from app.database.models import Job, OptimizedCv, User
from app.schemas.career_assistant import (
    AtsCvOptimizeOut,
    CvChangeOut,
    FollowUpIn,
    FollowUpOut,
    HiringInsightsBodyOut,
    HiringInsightsOut,
    InterviewPrepIn,
    InterviewPrepOut,
    LinkedinOptimizeIn,
    LinkedinOptimizeOut,
    SalaryNegotiationIn,
    SalaryNegotiationOut,
)
from app.services.career_assistant import (
    build_interview_prep,
    build_salary_negotiation,
    generate_follow_up_email,
    optimize_cv_for_application,
    optimize_linkedin_profile,
    research_hiring_insights_for_job,
)
from app.services.career_assistant_common import (
    get_application_for_user,
    get_candidate_for_user,
    get_interview_for_user,
    get_job_for_application,
)

router = APIRouter()


def _parse_changes(raw: str) -> list[CvChangeOut]:
    try:
        data = json.loads(raw or "[]")
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    out: list[CvChangeOut] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        out.append(
            CvChangeOut(
                section=str(item.get("section") or ""),
                before=str(item.get("before") or ""),
                after=str(item.get("after") or ""),
                reason=str(item.get("reason") or ""),
            )
        )
    return out


def _ats_out(row: OptimizedCv, application_id: int) -> AtsCvOptimizeOut:
    return AtsCvOptimizeOut(
        application_id=application_id,
        match_before=float(row.match_before),
        match_after=float(row.match_after),
        changes=_parse_changes(row.changes_json),
        optimized_cv_text=row.optimized_cv_text or "",
        created_at=row.created_at,
    )


@router.post("/applications/{application_id}/ats-cv", response_model=AtsCvOptimizeOut)
def post_ats_cv_optimize(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AtsCvOptimizeOut:
    app = get_application_for_user(db, user.id, application_id)
    candidate = get_candidate_for_user(db, user.id)
    job = get_job_for_application(db, app)
    try:
        row = optimize_cv_for_application(db, candidate=candidate, application=app, job=job)
    except ValueError as exc:
        if str(exc) == "Upload a CV first.":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _ats_out(row, app.id)


@router.get("/applications/{application_id}/ats-cv", response_model=AtsCvOptimizeOut)
def get_ats_cv_optimize(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AtsCvOptimizeOut:
    get_application_for_user(db, user.id, application_id)
    row = db.query(OptimizedCv).filter(OptimizedCv.application_id == application_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No ATS optimization yet")
    return _ats_out(row, application_id)


@router.post("/interview-prep", response_model=InterviewPrepOut)
def post_interview_prep(
    body: InterviewPrepIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InterviewPrepOut:
    if not body.application_id and not body.scheduled_interview_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide application_id or scheduled_interview_id",
        )
    candidate = get_candidate_for_user(db, user.id)
    application = None
    interview = None
    if body.scheduled_interview_id is not None:
        interview = get_interview_for_user(db, user.id, body.scheduled_interview_id)
    if body.application_id is not None:
        application = get_application_for_user(db, user.id, body.application_id)
    try:
        row = build_interview_prep(
            db,
            user_id=user.id,
            application=application,
            interview=interview,
            candidate_cv=candidate.cv_text or "",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    prep = json.loads(row.prep_json)
    return InterviewPrepOut(
        id=row.id,
        application_id=row.application_id,
        scheduled_interview_id=row.scheduled_interview_id,
        prep=prep if isinstance(prep, dict) else {},
        created_at=row.created_at,
    )


@router.post("/applications/{application_id}/salary-negotiation", response_model=SalaryNegotiationOut)
def post_salary_negotiation(
    application_id: int,
    body: SalaryNegotiationIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SalaryNegotiationOut:
    app = get_application_for_user(db, user.id, application_id)
    candidate = get_candidate_for_user(db, user.id)
    job = get_job_for_application(db, app)
    row = build_salary_negotiation(
        db,
        candidate=candidate,
        application=app,
        job=job,
        offer_pln=body.offer_pln,
    )
    neg = json.loads(row.negotiation_json)
    return SalaryNegotiationOut(
        id=row.id,
        application_id=row.application_id,
        negotiation=neg if isinstance(neg, dict) else {},
        created_at=row.created_at,
    )


@router.post("/interviews/{interview_id}/follow-up", response_model=FollowUpOut)
def post_follow_up_email(
    interview_id: int,
    body: FollowUpIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FollowUpOut:
    interview = get_interview_for_user(db, user.id, interview_id)
    row = generate_follow_up_email(db, interview=interview, notes=body.notes)
    email = json.loads(row.email_json)
    return FollowUpOut(
        id=row.id,
        scheduled_interview_id=row.scheduled_interview_id,
        email=email if isinstance(email, dict) else {},
        created_at=row.created_at,
    )


@router.post("/jobs/{job_id}/hiring-insights", response_model=HiringInsightsOut)
def post_hiring_insights(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HiringInsightsOut:
    del user  # auth gate only
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    insights, researched_at, from_cache = research_hiring_insights_for_job(db, job)
    body = HiringInsightsBodyOut(
        top_traits=insights["top_traits"],
        red_flags=insights["red_flags"],
        interview_focus=insights["interview_focus"],
        bar_summary=insights["bar_summary"],
    )
    return HiringInsightsOut(
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        insights=body,
        researched_at=researched_at,
        from_cache=from_cache,
    )


@router.post("/me/linkedin-optimize", response_model=LinkedinOptimizeOut)
def post_linkedin_optimize(
    body: LinkedinOptimizeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LinkedinOptimizeOut:
    candidate = get_candidate_for_user(db, user.id)
    try:
        row = optimize_linkedin_profile(db, candidate=candidate, target_role=body.target_role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    opt = json.loads(row.optimization_json)
    return LinkedinOptimizeOut(
        id=row.id,
        target_role=row.target_role,
        optimization=opt if isinstance(opt, dict) else {},
        created_at=row.created_at,
    )
