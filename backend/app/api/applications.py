"""Track job applications per candidate."""

import json
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.database.session import get_db
from app.automation.types import ApplyOutcome
from app.config import get_settings
from app.core.plans import PlanTier, count_tracked_applications, effective_plan_tier, max_tracked_applications
from app.schemas.application import (
    ApplicationCreate,
    ApplicationFeedbackInsightsOut,
    ApplicationListOut,
    ApplicationOut,
    ApplicationStatusEnum,
    ApplicationUpdate,
    AutoApplyOut,
    AutoApplyRequest,
    DevelopmentFocusOut,
    ParseFeedbackIn,
    RoleInsightRefOut,
    UpskillActionOut,
)
from app.services.auto_apply_service import auto_apply_for_user
from app.services.recruitment_feedback import build_feedback_insights, parse_stored_insights_json

router = APIRouter()


@router.get("/me", response_model=ApplicationListOut)
def list_my_applications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationListOut:
    candidate = _candidate_or_404(db, user.id)
    rows = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.candidate_id == candidate.id)
        .order_by(Application.updated_at.desc())
        .all()
    )
    items = [_to_out(app, job) for app, job in rows]
    return ApplicationListOut(items=items, total=len(items))


@router.get("/me/development-focus", response_model=DevelopmentFocusOut)
def development_focus(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DevelopmentFocusOut:
    candidate = _candidate_or_404(db, user.id)
    rows = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.candidate_id == candidate.id)
        .order_by(Application.updated_at.desc())
        .all()
    )
    return _aggregate_development_focus(rows)


@router.post("/", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    body: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationOut:
    candidate = _candidate_or_404(db, user.id)
    job = db.query(Job).filter(Job.id == body.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    existing = (
        db.query(Application)
        .filter(Application.candidate_id == candidate.id, Application.job_id == body.job_id)
        .first()
    )
    if existing:
        return _apply_application_update(
            existing,
            ApplicationUpdate(status=body.status, notes=body.notes),
            db,
            job,
        )

    tier = effective_plan_tier(user)
    cap = max_tracked_applications(tier)
    if cap is not None:
        tracked = count_tracked_applications(db, candidate.id)
        if tracked >= cap:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Free plan supports up to {cap} active tracked applications (rejected roles do not count). "
                    "Upgrade to Premium for unlimited tracking."
                ),
            )

    app = Application(
        candidate_id=candidate.id,
        job_id=body.job_id,
        status=_status(body.status),
        notes=body.notes,
        applied_at=datetime.utcnow() if body.status == ApplicationStatusEnum.applied else None,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return _to_out(app, job)


@router.post("/auto-apply", response_model=AutoApplyOut)
def auto_apply(
    body: AutoApplyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AutoApplyOut:
    """Run Playwright auto-apply (Pracuj.pl; Indeed needs visible browser for CAPTCHA)."""
    if effective_plan_tier(user) == PlanTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Auto-apply is available on Premium and Pro plans.",
        )
    settings = get_settings()
    submit = body.submit if body.submit is not None else settings.auto_apply_submit
    outcome, message, app = auto_apply_for_user(
        db, user=user, job_id=body.job_id, submit=submit
    )
    return AutoApplyOut(
        success=outcome in (ApplyOutcome.SUBMITTED, ApplyOutcome.FORM_FILLED),
        outcome=outcome.value,
        message=message,
        application_id=app.id if app else None,
    )


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: int,
    body: ApplicationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationOut:
    candidate = _candidate_or_404(db, user.id)
    row = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.id == application_id, Application.candidate_id == candidate.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    app, job = row
    return _apply_application_update(app, body, db, job)


@router.post("/{application_id}/parse-feedback", response_model=ApplicationOut)
def parse_application_feedback(
    application_id: int,
    body: ParseFeedbackIn = Body(default_factory=ParseFeedbackIn),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationOut:
    """Turn saved (or inline) recruiter notes into structured gaps and upskill actions."""
    candidate = _candidate_or_404(db, user.id)
    row = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.id == application_id, Application.candidate_id == candidate.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    app, job = row
    if body.raw_notes and body.raw_notes.strip():
        app.recruiter_feedback_raw = body.raw_notes.strip()[:12_000]
    raw = (app.recruiter_feedback_raw or "").strip()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add recruiter feedback notes first (save notes or pass raw_notes in the request body).",
        )
    try:
        insights = build_feedback_insights(raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    app.feedback_insights_json = json.dumps(insights)
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    return _to_out(app, job)


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    candidate = _candidate_or_404(db, user.id)
    app = (
        db.query(Application)
        .filter(Application.id == application_id, Application.candidate_id == candidate.id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    db.delete(app)
    db.commit()


def _candidate_or_404(db: Session, user_id: int) -> Candidate:
    candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return candidate


def _status(value: ApplicationStatusEnum) -> ApplicationStatus:
    return ApplicationStatus(value.value)


def _apply_application_update(
    app: Application,
    body: ApplicationUpdate,
    db: Session,
    job: Job,
) -> ApplicationOut:
    patch = body.model_dump(exclude_unset=True)
    if "status" in patch:
        app.status = _status(ApplicationStatusEnum(patch["status"]))
        if app.status == ApplicationStatus.APPLIED and not app.applied_at:
            app.applied_at = datetime.utcnow()
    if "notes" in patch:
        app.notes = patch["notes"]
    if "recruiter_feedback_raw" in patch:
        app.recruiter_feedback_raw = patch["recruiter_feedback_raw"] or None
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    return _to_out(app, job)


def _priority_rank(p: str) -> int:
    return {"high": 0, "medium": 1, "low": 2}.get(str(p).lower(), 1)


def _aggregate_development_focus(rows: list[tuple[Application, Job]]) -> DevelopmentFocusOut:
    skills: list[str] = []
    positions: list[str] = []
    stronger: list[str] = []
    seen_s: set[str] = set()
    seen_p: set[str] = set()
    seen_st: set[str] = set()

    def add_unique(bucket: list[str], seen: set[str], vals: list[str], cap: int) -> None:
        for v in vals:
            s = str(v).strip()
            if not s:
                continue
            k = s.lower()
            if k in seen:
                continue
            seen.add(k)
            bucket.append(s)
            if len(bucket) >= cap:
                return

    action_by_key: dict[str, UpskillActionOut] = {}
    roles: list[RoleInsightRefOut] = []

    for app, job in rows:
        ins = parse_stored_insights_json(app.feedback_insights_json)
        if not ins:
            continue
        add_unique(skills, seen_s, list(ins.get("skill_tool_gaps") or []), 48)
        add_unique(positions, seen_p, list(ins.get("positioning_gaps") or []), 36)
        add_unique(stronger, seen_st, list(ins.get("what_stronger_candidates_showed") or []), 28)
        summary = str(ins.get("summary") or "").strip() or None
        roles.append(
            RoleInsightRefOut(
                application_id=app.id,
                job_id=job.id,
                title=job.title,
                company=job.company,
                summary=summary,
            )
        )
        for a in ins.get("upskill_actions") or []:
            if not isinstance(a, dict):
                continue
            title = str(a.get("title") or "").strip()
            if not title:
                continue
            key = title.lower()
            pr = str(a.get("priority") or "medium").lower()
            if pr not in ("high", "medium", "low"):
                pr = "medium"
            cand = UpskillActionOut(
                title=title[:220],
                priority=pr,
                rationale=str(a.get("rationale") or "").strip()[:600],
            )
            old = action_by_key.get(key)
            if old is None or _priority_rank(cand.priority) < _priority_rank(old.priority):
                action_by_key[key] = cand

    sorted_actions = sorted(action_by_key.values(), key=lambda x: _priority_rank(x.priority))
    return DevelopmentFocusOut(
        skill_tool_gaps=skills,
        positioning_themes=positions,
        stronger_candidate_signals=stronger,
        upskill_actions_prioritized=sorted_actions[:24],
        roles_with_insights=roles[:40],
    )


def _to_out(app: Application, job: Job) -> ApplicationOut:
    insights_out: ApplicationFeedbackInsightsOut | None = None
    ins = parse_stored_insights_json(app.feedback_insights_json)
    if ins:
        try:
            insights_out = ApplicationFeedbackInsightsOut.model_validate(ins)
        except Exception:
            insights_out = None
    return ApplicationOut(
        id=app.id,
        job_id=job.id,
        status=ApplicationStatusEnum(app.status.value),
        notes=app.notes,
        recruiter_feedback_raw=app.recruiter_feedback_raw,
        feedback_insights=insights_out,
        applied_at=app.applied_at,
        updated_at=app.updated_at,
        title=job.title,
        company=job.company,
        location=job.location,
        url=job.url,
        job_board=job.job_board,
    )
