"""Track job applications per candidate."""

import csv
import json
import logging
from datetime import datetime
from io import BytesIO, StringIO
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Body, Depends, Header, HTTPException, Query, status
from fastapi.responses import Response, StreamingResponse
from openpyxl import Workbook
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.models import Application, ApplicationStatus, Candidate, Job, PlacementEvent, User
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
    PlacementDeclareIn,
    PlacementVerifyStartIn,
    PlacementVerifyStartOut,
    PlacementEventListOut,
    PlacementEventOut,
    RoleInsightRefOut,
    UpskillActionOut,
)
from app.services.auto_apply_guards import (
    enforce_auto_apply_redis_rate_limit,
    enforce_company_cooldown,
    enforce_daily_auto_apply_cap,
    enforce_human_ack_if_required,
    enforce_job_blocklists,
    record_auto_apply_event,
)
from app.services.auto_apply_service import auto_apply_for_user
from app.services.employer_webhook import dispatch_auto_apply_webhook
from app.services.idempotency import (
    normalize_idempotency_key,
    store_idempotent_response,
    try_replay_idempotent,
)
from app.services import referral_program as referral_prog
from app.services.placement_verification import declare_placement_intent, start_work_email_verification
from app.services.recruitment_feedback import build_feedback_insights, parse_stored_insights_json

router = APIRouter()
logger = logging.getLogger(__name__)

_APPLICATION_EXPORT_CSV_MAX_ROWS = 5000
_APPLICATION_EXPORT_CSV_NOTES_MAX = 50_000


def _iter_applications_csv_rows(db: Session, candidate_id: int, limit: int):
    """Yield UTF-8 chunks for CSV export (bounded rows; truncates huge notes cells)."""
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "application_id",
            "job_id",
            "status",
            "title",
            "company",
            "location",
            "job_board",
            "url",
            "applied_at",
            "updated_at",
            "notes",
            "placement_state",
            "placement_verified_at",
        ],
    )
    yield buf.getvalue().encode("utf-8")
    buf.seek(0)
    buf.truncate(0)
    base = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.candidate_id == candidate_id)
        .order_by(Application.updated_at.desc())
        .limit(limit)
    )
    for app, job in base.yield_per(200):
        notes = (app.notes or "").replace("\r\n", "\n").replace("\r", "\n")
        if len(notes) > _APPLICATION_EXPORT_CSV_NOTES_MAX:
            notes = notes[: _APPLICATION_EXPORT_CSV_NOTES_MAX] + "\n…(truncated)"
        writer.writerow(
            [
                app.id,
                job.id,
                app.status.value,
                job.title,
                job.company,
                job.location or "",
                job.job_board,
                job.url,
                app.applied_at.isoformat() if app.applied_at else "",
                app.updated_at.isoformat() if app.updated_at else "",
                notes,
                app.placement_state or "none",
                app.placement_verified_at.isoformat() if app.placement_verified_at else "",
            ],
        )
        yield buf.getvalue().encode("utf-8")
        buf.seek(0)
        buf.truncate(0)


@router.get(
    "/me",
    response_model=ApplicationListOut,
    summary="List my applications",
    description="Tracked applications for the signed-in candidate (newest first), with pagination.",
)
def list_my_applications(
    limit: int = Query(
        100,
        ge=1,
        le=500,
        description="Page size for application rows (dashboard may request up to 500).",
    ),
    offset: int = Query(0, ge=0, description="Offset into the candidate's applications (newest first)."),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationListOut:
    candidate = _candidate_or_404(db, user.id)
    total = db.query(Application).filter(Application.candidate_id == candidate.id).count()
    rows = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.candidate_id == candidate.id)
        .order_by(Application.updated_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    items = [_to_out(app, job) for app, job in rows]
    return ApplicationListOut(items=items, total=total)


@router.get(
    "/me/export.csv",
    summary="Export applications as CSV",
    description="Portable CSV of your pipeline (bounded rows; UTF-8).",
)
def export_my_applications_csv(
    limit: int = Query(
        2000,
        ge=1,
        le=_APPLICATION_EXPORT_CSV_MAX_ROWS,
        description="Maximum rows (newest first). Caps memory for very large pipelines.",
    ),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    """CSV export of the candidate's application pipeline (GDPR-friendly portable copy)."""
    candidate = _candidate_or_404(db, user.id)
    lim = min(limit, _APPLICATION_EXPORT_CSV_MAX_ROWS)
    return StreamingResponse(
        _iter_applications_csv_rows(db, candidate.id, lim),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="twin-applications.csv"'},
    )


@router.get(
    "/me/export.xlsx",
    summary="Export applications as Excel",
    description="Same columns as CSV, as an .xlsx workbook (bounded rows).",
)
def export_my_applications_xlsx(
    limit: int = Query(
        2000,
        ge=1,
        le=_APPLICATION_EXPORT_CSV_MAX_ROWS,
        description="Maximum rows (newest first). Same cap as CSV export.",
    ),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    """Excel export of the candidate's application pipeline (same fields as CSV)."""
    candidate = _candidate_or_404(db, user.id)
    lim = min(limit, _APPLICATION_EXPORT_CSV_MAX_ROWS)
    wb = Workbook()
    ws = wb.active
    assert ws is not None
    ws.title = "Applications"
    ws.append(
        [
            "application_id",
            "job_id",
            "status",
            "title",
            "company",
            "location",
            "job_board",
            "url",
            "applied_at",
            "updated_at",
            "notes",
            "placement_state",
            "placement_verified_at",
        ],
    )
    base = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.candidate_id == candidate.id)
        .order_by(Application.updated_at.desc())
        .limit(lim)
    )
    for app, job in base.yield_per(200):
        notes = (app.notes or "").replace("\r\n", "\n").replace("\r", "\n")
        if len(notes) > _APPLICATION_EXPORT_CSV_NOTES_MAX:
            notes = notes[: _APPLICATION_EXPORT_CSV_NOTES_MAX] + "\n…(truncated)"
        ws.append(
            [
                app.id,
                job.id,
                app.status.value,
                job.title,
                job.company,
                job.location or "",
                job.job_board,
                job.url,
                app.applied_at.isoformat() if app.applied_at else "",
                app.updated_at.isoformat() if app.updated_at else "",
                notes,
                app.placement_state or "none",
                app.placement_verified_at.isoformat() if app.placement_verified_at else "",
            ],
        )
    out = BytesIO()
    wb.save(out)
    out.seek(0)
    return Response(
        content=out.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="twin-applications.xlsx"'},
    )


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


def _maybe_store_application_create_idem(
    db: Session,
    *,
    idem_key: str | None,
    user_id: int,
    idem_payload: dict,
    out: ApplicationOut,
    response_status: int,
) -> None:
    if not idem_key:
        return
    store_idempotent_response(
        db,
        user_id=user_id,
        scope="applications.create",
        idempotency_key=idem_key,
        body=idem_payload,
        response_status=response_status,
        response_json=out.model_dump_json(),
    )


@router.post("/", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    body: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> ApplicationOut | Response:
    idem_key = normalize_idempotency_key(idempotency_key)
    idem_payload = body.model_dump(mode="json")
    if idem_key:
        replay = try_replay_idempotent(
            db,
            user_id=user.id,
            scope="applications.create",
            idempotency_key=idem_key,
            body=idem_payload,
        )
        if replay:
            st, js = replay
            return Response(content=js.encode("utf-8"), media_type="application/json", status_code=st)

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
        out = _apply_application_update(
            existing,
            ApplicationUpdate(status=body.status, notes=body.notes),
            db,
            job,
        )
        _maybe_store_application_create_idem(
            db,
            idem_key=idem_key,
            user_id=user.id,
            idem_payload=idem_payload,
            out=out,
            response_status=status.HTTP_201_CREATED,
        )
        return out

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
    out = _to_out(app, job)
    _maybe_store_application_create_idem(
        db,
        idem_key=idem_key,
        user_id=user.id,
        idem_payload=idem_payload,
        out=out,
        response_status=status.HTTP_201_CREATED,
    )
    return out


@router.post("/auto-apply", response_model=AutoApplyOut)
def auto_apply(
    background_tasks: BackgroundTasks,
    body: AutoApplyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> AutoApplyOut:
    """Run Playwright auto-apply (Pracuj.pl; Indeed needs visible browser for CAPTCHA)."""
    settings = get_settings()
    idem_key = normalize_idempotency_key(idempotency_key)
    idem_payload = body.model_dump(mode="json")
    if idem_key:
        replay = try_replay_idempotent(
            db,
            user_id=user.id,
            scope="applications.auto_apply",
            idempotency_key=idem_key,
            body=idem_payload,
        )
        if replay:
            return AutoApplyOut.model_validate_json(replay[1])

    if settings.auto_apply_require_premium and effective_plan_tier(user) == PlanTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Auto-apply is available on Premium and Pro plans.",
        )
    enforce_human_ack_if_required(settings=settings, human_acknowledged=body.human_acknowledged)
    enforce_auto_apply_redis_rate_limit(user_id=user.id, settings=settings)

    job = db.query(Job).filter(Job.id == body.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    enforce_job_blocklists(settings=settings, job=job)
    enforce_daily_auto_apply_cap(db=db, user_id=user.id, settings=settings)
    enforce_company_cooldown(db=db, user_id=user.id, settings=settings, job=job)

    submit = body.submit if body.submit is not None else settings.auto_apply_submit
    try:
        outcome, message, app = auto_apply_for_user(
            db, user=user, job_id=body.job_id, submit=submit
        )
    except Exception:
        logger.exception("auto_apply failed job_id=%s user_id=%s", body.job_id, user.id)
        out = AutoApplyOut(
            success=False,
            outcome=ApplyOutcome.FAILED.value,
            message=(
                "Auto-apply nie zadziałał z powodu błędu serwera (np. brak zapisalnego katalogu tymczasowego). "
                "Użyj „Aplikuj”, żeby otworzyć ofertę w nowej karcie, albo spróbuj ponownie później."
            ),
            application_id=None,
        )
    else:
        out = AutoApplyOut(
            success=outcome in (ApplyOutcome.SUBMITTED, ApplyOutcome.FORM_FILLED),
            outcome=outcome.value,
            message=message,
            application_id=app.id if app else None,
        )
        if out.success and settings.employer_webhook_url.strip():
            background_tasks.add_task(
                dispatch_auto_apply_webhook,
                get_settings(),
                application_id=out.application_id,
                job_id=body.job_id,
                user_id=user.id,
                outcome=out.outcome,
            )

    record_auto_apply_event(db, user_id=user.id, job=job, outcome=out.outcome)
    if idem_key:
        store_idempotent_response(
            db,
            user_id=user.id,
            scope="applications.auto_apply",
            idempotency_key=idem_key,
            body=idem_payload,
            response_status=status.HTTP_200_OK,
            response_json=out.model_dump_json(),
        )
    return out


@router.post(
    "/{application_id}/placement-verify/start",
    response_model=PlacementVerifyStartOut,
)
def placement_verify_start(
    application_id: int,
    body: PlacementVerifyStartIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PlacementVerifyStartOut:
    """Send a magic link to the candidate's work email to confirm placement (self-serve, no CS)."""
    settings = get_settings()
    try:
        sent, msg = start_work_email_verification(
            db,
            settings,
            user=user,
            application_id=application_id,
            work_email=body.work_email,
        )
        return PlacementVerifyStartOut(mail_sent=sent, message=msg)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{application_id}/placement-declare", response_model=ApplicationOut)
def placement_declare(
    application_id: int,
    body: PlacementDeclareIn = Body(default_factory=PlacementDeclareIn),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationOut:
    """Self-declare placement intent (required before work-email magic link)."""
    try:
        app = declare_placement_intent(db, user=user, application_id=application_id, note=body.note)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    job = db.query(Job).filter(Job.id == app.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return _to_out(app, job)


@router.get("/{application_id}/placement-events", response_model=PlacementEventListOut)
def list_placement_events(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PlacementEventListOut:
    """Append-only placement verification history (owner-only; IDOR-safe via Application join)."""
    candidate = _candidate_or_404(db, user.id)
    app = (
        db.query(Application)
        .filter(Application.id == application_id, Application.candidate_id == candidate.id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    rows = (
        db.query(PlacementEvent)
        .join(Application, Application.id == PlacementEvent.application_id)
        .filter(
            Application.candidate_id == candidate.id,
            PlacementEvent.application_id == application_id,
        )
        .order_by(PlacementEvent.created_at.desc())
        .limit(100)
        .all()
    )
    items: list[PlacementEventOut] = []
    for ev in rows:
        detail: dict | None = None
        if ev.detail_json:
            try:
                detail = json.loads(ev.detail_json)
            except json.JSONDecodeError:
                detail = None
        items.append(
            PlacementEventOut(
                id=ev.id,
                event_type=ev.event_type,
                actor=ev.actor,
                detail=detail,
                created_at=ev.created_at,
            )
        )
    return PlacementEventListOut(items=items, total=len(items))


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
        if app.status == ApplicationStatus.HIRED:
            cand = db.query(Candidate).filter(Candidate.id == app.candidate_id).first()
            if cand:
                referral_prog.on_referred_user_hired(db, cand.user_id, get_settings())
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
        placement_state=(app.placement_state or "none"),
        placement_work_email=app.placement_work_email,
        placement_reported_at=app.placement_reported_at,
        placement_verified_at=app.placement_verified_at,
        placement_declaration_note=app.placement_declaration_note,
    )
