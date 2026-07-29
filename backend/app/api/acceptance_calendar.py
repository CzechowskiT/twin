"""Acceptance Calendar API — career execution planning (no Microsoft write)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import acceptance_calendar as acal
from app.services import career_copilot as cc

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create your profile first")
    return row


class ConsentIn(BaseModel):
    internal_calendar_enabled: bool | None = None
    ms_busy_read_opt_in: bool | None = None
    google_busy_read_opt_in: bool | None = None
    ics_export_opt_in: bool | None = None
    store_availability_blocks: bool | None = None


class BudgetIn(BaseModel):
    hours_per_week: int | None = Field(default=None, ge=1, le=80)
    hours_per_day_cap: int | None = Field(default=None, ge=1, le=24)
    timezone: str | None = Field(default=None, max_length=64)
    protected_blocks: list | None = None
    note: str | None = Field(default=None, max_length=2000)


class OutcomeIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    description: str = Field(default="", max_length=4000)
    target_date: str | None = Field(default=None, max_length=64)
    outcome_id: int | None = None


class ItemActionIn(BaseModel):
    action: str = Field(
        ...,
        pattern="^(schedule|postpone|protect|complete|cancel|reopen|edit|dismiss)$",
    )
    postpone_hours: int | None = Field(default=None, ge=1, le=168)
    starts_at: str | None = None
    ends_at: str | None = None
    title: str | None = Field(default=None, max_length=300)


class HoldActionIn(BaseModel):
    action: str = Field(..., pattern="^(propose|accept|export|dismiss)$")


class WeeklyApproveIn(BaseModel):
    approved: bool


class PrefsIn(BaseModel):
    prefs: dict = Field(default_factory=dict)


@router.get("/me/acceptance-calendar")
def get_acceptance_calendar(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    refresh: bool = True,
) -> dict:
    cand = _candidate(db, user)
    return acal.build_acceptance_calendar_aggregate(
        db, candidate_id=cand.id, user_id=user.id, refresh=refresh
    )


@router.post("/me/acceptance-calendar/refresh")
def refresh_acceptance_calendar(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    result = acal.refresh_from_sources(db, candidate_id=cand.id)
    return {
        "refresh": result,
        "calendar": acal.build_acceptance_calendar_aggregate(
            db, candidate_id=cand.id, user_id=user.id, refresh=False
        ),
    }


@router.get("/me/acceptance-calendar/views/{view}")
def get_view(
    view: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    allowed = {
        "today",
        "agenda",
        "week",
        "month",
        "unscheduled",
        "deadlines",
        "interviews",
        "applications",
        "learning",
        "reviews",
        "at_risk",
    }
    if view not in allowed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_view")
    return {"view": view, "items": acal.list_items(db, candidate_id=cand.id, view=view)}


@router.patch("/me/acceptance-calendar/consent")
def patch_consent(
    body: ConsentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = acal.update_consent(
        db,
        candidate_id=cand.id,
        internal_calendar_enabled=body.internal_calendar_enabled,
        ms_busy_read_opt_in=body.ms_busy_read_opt_in,
        google_busy_read_opt_in=body.google_busy_read_opt_in,
        ics_export_opt_in=body.ics_export_opt_in,
        store_availability_blocks=body.store_availability_blocks,
    )
    return {"consent": acal._ser_consent(row)}


@router.patch("/me/acceptance-calendar/budget")
def patch_budget(
    body: BudgetIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = acal.update_budget(
        db,
        candidate_id=cand.id,
        hours_per_week=body.hours_per_week,
        hours_per_day_cap=body.hours_per_day_cap,
        timezone_name=body.timezone,
        protected_blocks=body.protected_blocks,
        note=body.note,
    )
    return {"budget": acal._ser_budget(row)}


@router.post("/me/acceptance-calendar/outcomes", status_code=status.HTTP_201_CREATED)
def post_outcome(
    body: OutcomeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    target = None
    if body.target_date:
        try:
            target = datetime.fromisoformat(body.target_date.replace("Z", "+00:00")).replace(
                tzinfo=None
            )
        except Exception as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_target_date") from exc
    row = acal.upsert_outcome(
        db,
        candidate_id=cand.id,
        title=cc.scrub_prompt_injection(body.title),
        description=cc.scrub_prompt_injection(body.description or ""),
        target_date=target,
        outcome_id=body.outcome_id,
    )
    return {
        "outcome": {
            "id": row.id,
            "title": row.title,
            "version": row.version,
            "claim_kind": row.claim_kind,
            "hiring_certainty": "UNKNOWN",
        }
    }


@router.post("/me/acceptance-calendar/items/{item_id}/action")
def item_action(
    item_id: int,
    body: ItemActionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)

    def _parse(raw: str | None) -> datetime | None:
        if not raw:
            return None
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).replace(tzinfo=None)

    try:
        row = acal.mutate_item(
            db,
            candidate_id=cand.id,
            item_id=item_id,
            action=body.action,
            postpone_hours=body.postpone_hours,
            starts_at=_parse(body.starts_at),
            ends_at=_parse(body.ends_at),
            title=cc.scrub_prompt_injection(body.title) if body.title else None,
        )
    except ValueError as exc:
        code = status.HTTP_404_NOT_FOUND if "not_found" in str(exc) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(code, detail=str(exc)) from exc
    return {"item": acal._ser_item(row)}


@router.post("/me/acceptance-calendar/holds/propose")
def propose_holds(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = 3,
) -> dict:
    cand = _candidate(db, user)
    rows = acal.propose_holds(db, candidate_id=cand.id, user_id=user.id, limit=limit)
    return {
        "holds": [acal._ser_hold(r) for r in rows],
        "externally_booked": False,
        "microsoft_write": False,
    }


@router.post("/me/acceptance-calendar/holds/{hold_id}/action")
def hold_action(
    hold_id: int,
    body: HoldActionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = acal.mutate_hold(
            db, candidate_id=cand.id, hold_id=hold_id, action=body.action
        )
    except ValueError as exc:
        code = status.HTTP_404_NOT_FOUND if "not_found" in str(exc) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(code, detail=str(exc)) from exc
    return {"hold": acal._ser_hold(row), "microsoft_write": False, "external_created": False}


@router.get("/me/acceptance-calendar/feasibility")
def get_feasibility(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return acal.compute_feasibility(db, candidate_id=cand.id, user_id=user.id)


@router.get("/me/acceptance-calendar/conflicts")
def get_conflicts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {
        "conflicts": acal.detect_conflicts(db, candidate_id=cand.id, user_id=user.id),
        "external_move": False,
    }


@router.get("/me/acceptance-calendar/microsoft")
def get_microsoft_status(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return acal.microsoft_read_status(db, candidate_id=cand.id, user_id=user.id)


@router.post("/me/acceptance-calendar/weekly-plan", status_code=status.HTTP_201_CREATED)
def post_weekly_plan(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = acal.create_weekly_plan(db, candidate_id=cand.id, user_id=user.id)
    return {
        "plan": {
            "id": row.id,
            "week_start": row.week_start,
            "strategy": acal._loads(row.strategy_json, {}),
            "user_approved": row.user_approved,
            "version": row.version,
        }
    }


@router.post("/me/acceptance-calendar/weekly-plan/{plan_id}/approve")
def approve_weekly(
    plan_id: int,
    body: WeeklyApproveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = acal.approve_weekly_plan(
            db, candidate_id=cand.id, plan_id=plan_id, approved=body.approved
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"plan": {"id": row.id, "user_approved": row.user_approved}}


@router.get("/me/acceptance-calendar/monthly")
def get_monthly(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return acal.monthly_overview(db, candidate_id=cand.id, user_id=user.id)


@router.post("/me/acceptance-calendar/preferences")
def post_prefs(
    body: PrefsIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = acal.save_preference_feedback(db, candidate_id=cand.id, prefs=body.prefs)
    return {
        "preference": {
            "version": row.version,
            "prefs": acal._loads(row.prefs_json, {}),
            "active": row.active,
        }
    }


@router.get("/me/acceptance-calendar/ics")
def get_ics(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    cand = _candidate(db, user)
    try:
        body = acal.build_ics_for_candidate(db, candidate_id=cand.id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="twin-acceptance.ics"'},
    )


@router.get("/me/acceptance-calendar/export")
def export_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return acal.export_calendar_data(db, candidate_id=cand.id)


@router.post("/me/acceptance-calendar/history/delete")
def delete_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return acal.delete_calendar_data(db, candidate_id=cand.id)
