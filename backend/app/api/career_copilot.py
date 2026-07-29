"""Career Copilot 2.0 + Adaptive Career Intelligence API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import Candidate, User
from app.services import career_copilot as cc
from app.services import career_copilot_adaptive as adaptive
from app.services import career_daily_os as daily_os

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


class MemoryEditIn(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    body: dict[str, Any] | None = None


class PrefOverrideIn(BaseModel):
    pref_key: str = Field(..., max_length=64)
    value: dict[str, Any] = Field(default_factory=dict)


class OpportunityIn(BaseModel):
    opportunity_title: str = Field(..., min_length=2, max_length=200)
    required_skills: list[str] | None = Field(default=None, max_length=20)


class ScenarioIn(BaseModel):
    options: list[str] = Field(default_factory=list, max_length=12)
    title: str | None = Field(default=None, max_length=200)


class LearningLoopIn(BaseModel):
    useful: bool | None = None
    prediction_correct: bool | None = None
    surprise: str | None = Field(default=None, max_length=2000)
    improve_reasoning: str | None = Field(default=None, max_length=2000)
    milestone_ref: str | None = Field(default=None, max_length=128)


@router.get("/me/career-copilot")
def get_career_copilot(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return daily_os.build_daily_os_aggregate(db, candidate_id=cand.id)


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
    return daily_os.build_daily_os_aggregate(db, candidate_id=cand.id)


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


@router.get("/me/career-copilot/adaptive")
def get_adaptive(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return adaptive.build_adaptive_aggregate(db, candidate_id=cand.id)


@router.get("/me/career-copilot/memories")
def get_memories(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"memories": adaptive.list_memories(db, candidate_id=cand.id)}


@router.patch("/me/career-copilot/memories/{memory_id}")
def patch_memory(
    memory_id: int,
    body: MemoryEditIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = adaptive.edit_memory(
            db,
            candidate_id=cand.id,
            memory_id=memory_id,
            title=body.title,
            body=body.body,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {
        "memory": {
            "id": row.id,
            "memory_key": row.memory_key,
            "title": row.title,
            "version": row.version,
            "editable": True,
        }
    }


@router.get("/me/career-copilot/preferences")
def get_preferences(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    rows = adaptive.infer_preferences(db, candidate_id=cand.id)
    return {
        "preferences": [
            {
                "id": p.id,
                "pref_key": p.pref_key,
                "value": cc._loads(p.value_json, {}),
                "confidence": p.confidence,
                "evidence": cc._loads(p.evidence_json, []),
                "claim_kind": p.claim_kind,
                "user_override": p.user_override,
                "editable": p.editable,
            }
            for p in rows
        ]
    }


@router.post("/me/career-copilot/preferences/override")
def post_pref_override(
    body: PrefOverrideIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = adaptive.set_preference_override(
            db, candidate_id=cand.id, pref_key=body.pref_key, value=body.value
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "preference": {
            "id": row.id,
            "pref_key": row.pref_key,
            "value": cc._loads(row.value_json, {}),
            "user_override": row.user_override,
        }
    }


@router.get("/me/career-copilot/ranking")
def get_ranking(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"ranked": adaptive.rank_recommendations(db, candidate_id=cand.id)}


@router.post("/me/career-copilot/opportunity-intelligence")
def post_opportunity_intel(
    body: OpportunityIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return adaptive.opportunity_intelligence(
        db,
        candidate_id=cand.id,
        opportunity_title=cc.scrub_prompt_injection(body.opportunity_title),
        required_skills=body.required_skills,
    )


@router.get("/me/career-copilot/timeline")
def get_timeline(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"timeline": adaptive.list_timeline(db, candidate_id=cand.id)}


@router.get("/me/career-copilot/skill-evolution")
def get_skill_evolution(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"skills": adaptive.refresh_skill_evolution(db, candidate_id=cand.id)}


@router.get("/me/career-copilot/health")
def get_health(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return adaptive.compute_health_score(db, candidate_id=cand.id, force=True)


@router.post("/me/career-copilot/scenarios", status_code=status.HTTP_201_CREATED)
def post_scenario(
    body: ScenarioIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = adaptive.create_scenario(
        db,
        candidate_id=cand.id,
        options=body.options or [],
        title=body.title,
    )
    return {
        "scenario": {
            "id": row.id,
            "scenario_key": row.scenario_key,
            "title": row.title,
            "comparison": cc._loads(row.comparison_json, {}),
            "ranking_explain": cc._loads(row.ranking_explain_json, {}),
            "confidence": row.confidence,
            "claims": cc._loads(row.claims_json, []),
        }
    }


@router.post("/me/career-copilot/learning-loop", status_code=status.HTTP_201_CREATED)
def post_learning_loop(
    body: LearningLoopIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = adaptive.submit_learning_loop(
        db,
        candidate_id=cand.id,
        useful=body.useful,
        prediction_correct=body.prediction_correct,
        surprise=body.surprise,
        improve_reasoning=body.improve_reasoning,
        milestone_ref=body.milestone_ref,
    )
    return {
        "entry": {
            "id": row.id,
            "useful": row.useful,
            "prediction_correct": row.prediction_correct,
            "surprise": row.surprise,
            "improve_reasoning": row.improve_reasoning,
        }
    }


class BriefActionIn(BaseModel):
    action: str = Field(..., pattern="^(dismiss|snooze|reopen)$")
    snooze_hours: int | None = Field(default=None, ge=1, le=48)


class InboxActionIn(BaseModel):
    action: str = Field(..., pattern="^(pin|demote|dismiss|snooze|complete|reopen|seen|archive)$")
    snooze_hours: int | None = Field(default=None, ge=1, le=168)


class CadenceIn(BaseModel):
    timezone: str | None = Field(default=None, max_length=64)
    quiet_hours_start: int | None = Field(default=None, ge=0, le=23)
    quiet_hours_end: int | None = Field(default=None, ge=0, le=23)
    intensity: str | None = Field(default=None, pattern="^(low|normal|high)$")
    quiet_mode: bool | None = None
    paused_modules: list[str] | None = None
    daily_cap: int | None = Field(default=None, ge=1, le=20)
    cooldown_hours: int | None = Field(default=None, ge=1, le=168)


class PrivacyIn(BaseModel):
    learning_enabled: bool | None = None
    briefs_enabled: bool | None = None
    reminders_enabled: bool | None = None
    email_reminders_opt_in: bool | None = None


class WatchIn(BaseModel):
    watch_type: str = Field(..., pattern="^(role|company|industry|location|skill|direction)$")
    label: str = Field(..., min_length=1, max_length=200)
    criteria: dict | None = None


class ReminderIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    due_at: str = Field(..., max_length=64)
    channel: str = Field(default="in_product", pattern="^(in_product|email)$")


class ReviewApproveIn(BaseModel):
    approved: bool


@router.get("/me/career-copilot/daily")
def get_daily_os(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return daily_os.build_daily_os_aggregate(db, candidate_id=cand.id)


@router.post("/me/career-copilot/daily/brief/refresh")
def refresh_daily_brief(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return daily_os.ensure_daily_brief(db, candidate_id=cand.id, force=True)


@router.post("/me/career-copilot/daily/brief/action")
def daily_brief_action(
    body: BriefActionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        return daily_os.mutate_brief(
            db, candidate_id=cand.id, action=body.action, snooze_hours=body.snooze_hours
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/me/career-copilot/daily/inbox")
def get_daily_inbox(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return {"inbox": daily_os.list_inbox(db, candidate_id=cand.id), "kpi_excluded": True}


@router.post("/me/career-copilot/daily/inbox/{item_id}/action")
def daily_inbox_action(
    item_id: int,
    body: InboxActionIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = daily_os.mutate_inbox(
            db,
            candidate_id=cand.id,
            item_id=item_id,
            action=body.action,
            snooze_hours=body.snooze_hours,
        )
    except ValueError as exc:
        code = status.HTTP_404_NOT_FOUND if "not_found" in str(exc) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(code, detail=str(exc)) from exc
    return {"item": daily_os._ser_inbox(row)}


@router.patch("/me/career-copilot/daily/cadence")
def patch_cadence(
    body: CadenceIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = daily_os.update_cadence(
        db,
        candidate_id=cand.id,
        timezone_name=body.timezone,
        quiet_hours_start=body.quiet_hours_start,
        quiet_hours_end=body.quiet_hours_end,
        intensity=body.intensity,
        quiet_mode=body.quiet_mode,
        paused_modules=body.paused_modules,
        daily_cap=body.daily_cap,
        cooldown_hours=body.cooldown_hours,
    )
    return {
        "cadence": {
            "timezone": row.timezone,
            "quiet_mode": row.quiet_mode,
            "intensity": row.intensity,
            "daily_cap": row.daily_cap,
            "cooldown_hours": row.cooldown_hours,
        }
    }


@router.patch("/me/career-copilot/daily/privacy")
def patch_daily_privacy(
    body: PrivacyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    row = daily_os.update_privacy(
        db,
        candidate_id=cand.id,
        learning_enabled=body.learning_enabled,
        briefs_enabled=body.briefs_enabled,
        reminders_enabled=body.reminders_enabled,
        email_reminders_opt_in=body.email_reminders_opt_in,
    )
    return {
        "privacy": {
            "learning_enabled": row.learning_enabled,
            "briefs_enabled": row.briefs_enabled,
            "reminders_enabled": row.reminders_enabled,
            "email_reminders_opt_in": row.email_reminders_opt_in,
        }
    }


@router.post("/me/career-copilot/daily/watchlist", status_code=status.HTTP_201_CREATED)
def post_watch(
    body: WatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = daily_os.add_watch(
            db,
            candidate_id=cand.id,
            watch_type=body.watch_type,
            label=cc.scrub_prompt_injection(body.label),
            criteria=body.criteria,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "watch": {
            "id": row.id,
            "watch_type": row.watch_type,
            "label": row.label,
            "freshness": row.freshness,
        }
    }


@router.post("/me/career-copilot/daily/reminders", status_code=status.HTTP_201_CREATED)
def post_reminder(
    body: ReminderIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    from datetime import datetime

    cand = _candidate(db, user)
    try:
        due = datetime.fromisoformat(body.due_at.replace("Z", "+00:00")).replace(tzinfo=None)
        row = daily_os.schedule_reminder(
            db,
            candidate_id=cand.id,
            title=cc.scrub_prompt_injection(body.title),
            due_at=due,
            channel=body.channel,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_due_at") from exc
    return {
        "reminder": {
            "id": row.id,
            "title": row.title,
            "due_at": row.due_at.isoformat() + "Z",
            "channel": row.channel,
            "status": row.status,
        }
    }


@router.post("/me/career-copilot/daily/reviews", status_code=status.HTTP_201_CREATED)
def post_review(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    period: str = "weekly",
) -> dict:
    cand = _candidate(db, user)
    row = daily_os.create_progress_review(db, candidate_id=cand.id, period=period)
    return {
        "review": {
            "id": row.id,
            "period": row.period,
            "summary": cc._loads(row.summary_json, {}),
            "proposed_changes": cc._loads(row.proposed_changes_json, []),
            "user_approved": row.user_approved,
        }
    }


@router.post("/me/career-copilot/daily/reviews/{review_id}/approve")
def approve_review(
    review_id: int,
    body: ReviewApproveIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    try:
        row = daily_os.approve_progress_review(
            db, candidate_id=cand.id, review_id=review_id, approved=body.approved
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"review": {"id": row.id, "user_approved": row.user_approved}}


@router.get("/me/career-copilot/daily/export")
def export_daily(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return daily_os.export_daily_history(db, candidate_id=cand.id)


@router.post("/me/career-copilot/daily/history/delete")
def delete_daily(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    cand = _candidate(db, user)
    return daily_os.delete_daily_history(db, candidate_id=cand.id)
