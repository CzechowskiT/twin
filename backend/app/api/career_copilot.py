"""Career Copilot 2.0 API — candidate-owned persistent advisor."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import career_copilot as cc

router = APIRouter()


def _candidate(db: Session, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Create your profile first")
    return row


class GoalCreateIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    goal_type: str = Field(default="career", max_length=64)
    target_role: str | None = Field(default=None, max_length=200)


class GoalStatusIn(BaseModel):
    status: str = Field(..., max_length=32)
    progress_percent: int | None = Field(default=None, ge=0, le=100)


class DirectionOverrideIn(BaseModel):
    action: str = Field(..., pattern="^(accept|reject|restart)$")


class RecStatusIn(BaseModel):
    status: str = Field(..., pattern="^(accepted|rejected|ignored|completed|suggested)$")


class ActionStatusIn(BaseModel):
    status: str = Field(..., pattern="^(planned|in_progress|completed|skipped)$")


class ReflectionIn(BaseModel):
    improved: str | None = Field(default=None, max_length=1000)
    did_not: str | None = Field(default=None, max_length=1000)
    changed: str | None = Field(default=None, max_length=1000)
    next_step: str | None = Field(default=None, max_length=1000)
    milestone_ref: str | None = Field(default=None, max_length=128)


class SimulateIn(BaseModel):
    options: list[str] | None = Field(default=None, max_length=8)


@router.get("/me/career-copilot")
def get_career_copilot(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return cc.build_aggregate(db, candidate_id=cand.id)


@router.post("/me/career-copilot/refresh")
def refresh_career_copilot(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    cc.refresh_graph(db, candidate_id=cand.id)
    cc.refresh_directions(db, candidate_id=cand.id)
    cc.ensure_action_plan(db, candidate_id=cand.id, force=False)
    cc.sync_direction_recommendations(db, candidate_id=cand.id)
    return cc.build_aggregate(db, candidate_id=cand.id)


@router.get("/me/career-copilot/overview")
def get_copilot_overview(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return cc.compass_overview(db, candidate_id=cand.id)


@router.get("/me/career-copilot/gaps")
def get_copilot_gaps(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return cc.analyze_gaps(db, candidate_id=cand.id)


@router.get("/me/career-copilot/market")
def get_copilot_market(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return cc.market_intelligence(db, candidate_id=cand.id)


@router.post("/me/career-copilot/actions/rebuild")
def rebuild_actions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    # Soft rebuild: only if empty; force via query would wipe — keep additive for history
    rows = cc.ensure_action_plan(db, candidate_id=cand.id, force=False)
    return {"actions": [cc.serialize_action(a) for a in rows]}


@router.patch("/me/career-copilot/actions/{action_id}")
def patch_action(
    action_id: int,
    body: ActionStatusIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = cc.update_action_status(
            db, candidate_id=cand.id, action_id=action_id, status=body.status
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"action": cc.serialize_action(row)}


@router.post("/me/career-copilot/directions/{path_key}/override")
def override_direction(
    path_key: str,
    body: DirectionOverrideIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = cc.set_direction_override(
            db, candidate_id=cand.id, path_key=path_key[:64], action=body.action
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"direction": cc.serialize_direction(row)}


@router.get("/me/career-copilot/goals")
def get_goals(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"goals": [cc.serialize_goal(g) for g in cc.list_goals(db, candidate_id=cand.id)]}


@router.post("/me/career-copilot/goals", status_code=status.HTTP_201_CREATED)
def post_goal(
    body: GoalCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    title = cc.scrub_prompt_injection(body.title)
    row = cc.create_goal(
        db,
        candidate_id=cand.id,
        title=title,
        goal_type=body.goal_type,
        target_role=body.target_role,
    )
    return {"goal": cc.serialize_goal(row)}


@router.patch("/me/career-copilot/goals/{goal_id}")
def patch_goal(
    goal_id: int,
    body: GoalStatusIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = cc.update_goal_status(
            db,
            candidate_id=cand.id,
            goal_id=goal_id,
            status=body.status,
            progress_percent=body.progress_percent,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"goal": cc.serialize_goal(row)}


@router.patch("/me/career-copilot/recommendations/{rec_id}")
def patch_recommendation(
    rec_id: int,
    body: RecStatusIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = cc.set_recommendation_status(
            db, candidate_id=cand.id, rec_id=rec_id, status=body.status
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"recommendation": cc.serialize_rec(row)}


@router.post("/me/career-copilot/simulate")
def post_simulate(
    body: SimulateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = cc.simulate_decision(db, candidate_id=cand.id, options=body.options)
    return {
        "decision": {
            "id": row.id,
            "scenario_key": row.scenario_key,
            "title": row.title,
            "comparison": cc._loads(row.comparison_json, {}),
            "confidence": row.confidence,
            "claims": cc._loads(row.claims_json, []),
        }
    }


@router.post("/me/career-copilot/reflections", status_code=status.HTTP_201_CREATED)
def post_reflection(
    body: ReflectionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = cc.add_reflection(
            db,
            candidate_id=cand.id,
            improved=cc.scrub_prompt_injection(body.improved or ""),
            did_not=cc.scrub_prompt_injection(body.did_not or ""),
            changed=cc.scrub_prompt_injection(body.changed or ""),
            next_step=cc.scrub_prompt_injection(body.next_step or ""),
            milestone_ref=body.milestone_ref,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"reflection": {"id": row.id, "body": cc._loads(row.body_json, {})}}
