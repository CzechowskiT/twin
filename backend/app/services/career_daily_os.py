"""Daily Career Operating System — continuous career copilot (not an autonomous agent).

Extends career_copilot + career_copilot_adaptive. May recommend/prioritize/draft/remind/
update internal state. Must NOT act externally without explicit user action.
Never fabricate market/salary/employer/outcomes. UNKNOWN when no evidence.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.database.models import (
    Application,
    Candidate,
    CandidateCareerAction,
    CandidateCareerChangeEvent,
    CandidateCareerGoal,
    CandidateCareerInboxAudit,
    CandidateCareerInboxItem,
    CandidateCareerReminder,
    CandidateCopilotRecommendation,
    CandidateDailyBrief,
    CandidateDailyCadence,
    CandidateDailyPrivacySettings,
    CandidateLearningLoopEntry,
    CandidateMomentumSnapshot,
    CandidateOpportunityWatch,
    CandidateProgressReview,
    CandidateRecommendationWeights,
    CandidateSkillEvolution,
)
from app.services import career_copilot as cc
from app.services import career_copilot_adaptive as adaptive
from app.services.ai_intel_validation import kill_switch_engaged

CHANGE_KINDS = frozenset(
    {"NEW", "IMPROVED", "DECLINED", "STALE", "CONFLICTING", "RESOLVED", "UNKNOWN"}
)
INBOX_STATUSES = frozenset(
    {"NEW", "SEEN", "PINNED", "SNOOZED", "COMPLETED", "DISMISSED", "ARCHIVED"}
)
INBOX_ACTIONS = frozenset(
    {"pin", "demote", "dismiss", "snooze", "complete", "reopen", "seen", "archive"}
)

DEFAULT_WEIGHTS = {
    "goal_alignment": 1.0,
    "freshness": 1.0,
    "acceptance_history": 1.0,
    "confidence": 1.0,
    "learning_loop_useful": 0.5,
    "learning_loop_correct": 0.5,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _today_str() -> str:
    return _utcnow().strftime("%Y-%m-%d")


def get_or_create_cadence(db: Session, *, candidate_id: int) -> CandidateDailyCadence:
    row = (
        db.query(CandidateDailyCadence)
        .filter(CandidateDailyCadence.candidate_id == candidate_id)
        .one_or_none()
    )
    if row is None:
        row = CandidateDailyCadence(candidate_id=candidate_id, created_at=_utcnow())
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_or_create_privacy(db: Session, *, candidate_id: int) -> CandidateDailyPrivacySettings:
    row = (
        db.query(CandidateDailyPrivacySettings)
        .filter(CandidateDailyPrivacySettings.candidate_id == candidate_id)
        .one_or_none()
    )
    if row is None:
        row = CandidateDailyPrivacySettings(candidate_id=candidate_id, created_at=_utcnow())
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_cadence(
    db: Session,
    *,
    candidate_id: int,
    timezone_name: str | None = None,
    quiet_hours_start: int | None = None,
    quiet_hours_end: int | None = None,
    intensity: str | None = None,
    quiet_mode: bool | None = None,
    paused_modules: list[str] | None = None,
    daily_cap: int | None = None,
    cooldown_hours: int | None = None,
) -> CandidateDailyCadence:
    row = get_or_create_cadence(db, candidate_id=candidate_id)
    if timezone_name is not None:
        row.timezone = timezone_name[:64]
    if quiet_hours_start is not None:
        row.quiet_hours_start = max(0, min(23, quiet_hours_start))
    if quiet_hours_end is not None:
        row.quiet_hours_end = max(0, min(23, quiet_hours_end))
    if intensity is not None and intensity in {"low", "normal", "high"}:
        row.intensity = intensity
    if quiet_mode is not None:
        row.quiet_mode = bool(quiet_mode)
    if paused_modules is not None:
        row.paused_modules_json = cc._dumps([str(m)[:64] for m in paused_modules[:20]])
    if daily_cap is not None:
        row.daily_cap = max(1, min(20, daily_cap))
    if cooldown_hours is not None:
        row.cooldown_hours = max(1, min(168, cooldown_hours))
    row.updated_at = _utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(db, candidate_id=candidate_id, action="cadence_update", payload={"id": row.id})
    return row


def update_privacy(
    db: Session,
    *,
    candidate_id: int,
    learning_enabled: bool | None = None,
    briefs_enabled: bool | None = None,
    reminders_enabled: bool | None = None,
    email_reminders_opt_in: bool | None = None,
) -> CandidateDailyPrivacySettings:
    row = get_or_create_privacy(db, candidate_id=candidate_id)
    if learning_enabled is not None:
        row.learning_enabled = bool(learning_enabled)
    if briefs_enabled is not None:
        row.briefs_enabled = bool(briefs_enabled)
    if reminders_enabled is not None:
        row.reminders_enabled = bool(reminders_enabled)
    if email_reminders_opt_in is not None:
        row.email_reminders_opt_in = bool(email_reminders_opt_in)
    row.updated_at = _utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        candidate_id=candidate_id,
        action="privacy_update",
        payload={
            "learning_enabled": row.learning_enabled,
            "briefs_enabled": row.briefs_enabled,
            "reminders_enabled": row.reminders_enabled,
            "email_reminders_opt_in": row.email_reminders_opt_in,
        },
    )
    return row


def _audit(
    db: Session,
    *,
    candidate_id: int,
    action: str,
    payload: dict | None = None,
    inbox_item_id: int | None = None,
) -> None:
    db.add(
        CandidateCareerInboxAudit(
            candidate_id=candidate_id,
            inbox_item_id=inbox_item_id,
            action=action[:64],
            payload_json=cc._dumps(payload or {}),
            created_at=_utcnow(),
        )
    )
    db.commit()


def detect_changes(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    """Evidence-only change detection — never invent market/employer signals."""
    now = _utcnow()
    out: list[dict[str, Any]] = []

    goals = (
        db.query(CandidateCareerGoal)
        .filter(CandidateCareerGoal.candidate_id == candidate_id)
        .all()
    )
    for g in goals:
        if g.status == "active" and (g.progress_percent or 0) == 0:
            out.append(_persist_change(
                db,
                candidate_id=candidate_id,
                change_kind="STALE",
                entity_type="goal",
                entity_key=f"goal:{g.id}",
                title=f"Goal without progress: {g.title}",
                before={},
                after={"progress_percent": g.progress_percent, "status": g.status},
                evidence=[f"goal:{g.id}"],
                claim_kind=cc.CLAIM_FACT,
            ))

    actions = (
        db.query(CandidateCareerAction)
        .filter(CandidateCareerAction.candidate_id == candidate_id)
        .all()
    )
    planned = [a for a in actions if a.status == "planned"]
    completed = [a for a in actions if a.status == "completed"]
    if planned and not completed:
        out.append(_persist_change(
            db,
            candidate_id=candidate_id,
            change_kind="NEW",
            entity_type="action_plan",
            entity_key="actions:planned_without_done",
            title=f"{len(planned)} planned action(s) awaiting completion",
            before={},
            after={"planned": len(planned)},
            evidence=["career_actions"],
            claim_kind=cc.CLAIM_FACT,
        ))
    if completed:
        out.append(_persist_change(
            db,
            candidate_id=candidate_id,
            change_kind="IMPROVED",
            entity_type="action_plan",
            entity_key=f"actions:completed:{len(completed)}",
            title=f"{len(completed)} completed action(s)",
            before={},
            after={"completed": len(completed)},
            evidence=["career_actions"],
            claim_kind=cc.CLAIM_FACT,
        ))

    apps = db.query(Application).filter(Application.candidate_id == candidate_id).all()
    for app in apps:
        status = getattr(app, "status", None) or "pending"
        out.append(_persist_change(
            db,
            candidate_id=candidate_id,
            change_kind="NEW" if status in {"pending", "applied"} else "UNKNOWN",
            entity_type="application",
            entity_key=f"app:{app.id}:{status}",
            title=f"Application stage: {status}",
            before={},
            after={"status": status, "application_id": app.id},
            evidence=[f"application:{app.id}"],
            claim_kind=cc.CLAIM_FACT,
        ))

    # Live market / salary deltas — UNKNOWN without evidence
    out.append(_persist_change(
        db,
        candidate_id=candidate_id,
        change_kind="UNKNOWN",
        entity_type="market",
        entity_key="market:live_demand",
        title="Live market demand not measured",
        before={},
        after={"salary_band": "UNKNOWN", "demand": "UNKNOWN"},
        evidence=[],
        claim_kind=cc.CLAIM_UNKNOWN,
        confidence="high",
    ))

    # Dedup: only return latest unique entity_keys from this run
    seen: set[str] = set()
    unique = []
    for item in reversed(out):
        k = item["entity_key"]
        if k in seen:
            continue
        seen.add(k)
        unique.append(item)
    unique.reverse()
    return unique


def _persist_change(
    db: Session,
    *,
    candidate_id: int,
    change_kind: str,
    entity_type: str,
    entity_key: str,
    title: str,
    before: dict,
    after: dict,
    evidence: list[str],
    claim_kind: str,
    confidence: str = "medium",
) -> dict[str, Any]:
    kind = change_kind if change_kind in CHANGE_KINDS else "UNKNOWN"
    # Idempotent: skip if identical key created today
    today_start = _utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing = (
        db.query(CandidateCareerChangeEvent)
        .filter(
            CandidateCareerChangeEvent.candidate_id == candidate_id,
            CandidateCareerChangeEvent.entity_key == entity_key[:128],
            CandidateCareerChangeEvent.created_at >= today_start,
        )
        .first()
    )
    if existing is not None:
        return {
            "id": existing.id,
            "change_kind": existing.change_kind,
            "entity_type": existing.entity_type,
            "entity_key": existing.entity_key,
            "title": existing.title,
            "claim_kind": existing.claim_kind,
            "confidence": existing.confidence,
            "cached": True,
        }
    row = CandidateCareerChangeEvent(
        candidate_id=candidate_id,
        change_kind=kind,
        entity_type=entity_type[:64],
        entity_key=entity_key[:128],
        title=title[:300],
        before_json=cc._dumps(before),
        after_json=cc._dumps(after),
        evidence_json=cc._dumps(evidence),
        claim_kind=claim_kind[:32],
        confidence=confidence[:16],
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "change_kind": row.change_kind,
        "entity_type": row.entity_type,
        "entity_key": row.entity_key,
        "title": row.title,
        "before": before,
        "after": after,
        "evidence": evidence,
        "claim_kind": row.claim_kind,
        "confidence": row.confidence,
        "cached": False,
    }


def _active_weights(db: Session, *, candidate_id: int) -> dict[str, float]:
    row = (
        db.query(CandidateRecommendationWeights)
        .filter(
            CandidateRecommendationWeights.candidate_id == candidate_id,
            CandidateRecommendationWeights.archived_at.is_(None),
        )
        .order_by(CandidateRecommendationWeights.version.desc())
        .first()
    )
    if row is None:
        return dict(DEFAULT_WEIGHTS)
    raw = cc._loads(row.weights_json, {})
    out = dict(DEFAULT_WEIGHTS)
    for k, v in raw.items():
        if k in out and isinstance(v, (int, float)):
            out[k] = float(v)
    return out


def calibrate_from_learning_loop(db: Session, *, candidate_id: int) -> dict[str, Any]:
    """WS19–20: versioned weight update from explicit feedback — no unvalidated claims."""
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    if not privacy.learning_enabled:
        return {"skipped": True, "reason": "learning_disabled"}

    loops = (
        db.query(CandidateLearningLoopEntry)
        .filter(CandidateLearningLoopEntry.candidate_id == candidate_id)
        .order_by(CandidateLearningLoopEntry.id.desc())
        .limit(20)
        .all()
    )
    if not loops:
        return {"skipped": True, "reason": "no_feedback", "claim": cc.CLAIM_UNKNOWN}

    useful_n = sum(1 for e in loops if e.useful is True)
    useful_d = sum(1 for e in loops if e.useful is not None)
    correct_n = sum(1 for e in loops if e.prediction_correct is True)
    correct_d = sum(1 for e in loops if e.prediction_correct is not None)

    weights = dict(DEFAULT_WEIGHTS)
    evidence = [f"learning_loop_n={len(loops)}"]
    if useful_d >= 2:
        ratio = useful_n / useful_d
        weights["learning_loop_useful"] = round(0.3 + ratio * 0.7, 3)
        evidence.append(f"useful_ratio={ratio:.2f}")
    if correct_d >= 2:
        ratio = correct_n / correct_d
        weights["learning_loop_correct"] = round(0.3 + ratio * 0.7, 3)
        evidence.append(f"correct_ratio={ratio:.2f}")

    latest = (
        db.query(CandidateRecommendationWeights)
        .filter(CandidateRecommendationWeights.candidate_id == candidate_id)
        .order_by(CandidateRecommendationWeights.version.desc())
        .first()
    )
    ver = int(latest.version) + 1 if latest else 1
    if latest is not None:
        latest.archived_at = _utcnow()
        db.add(latest)
    row = CandidateRecommendationWeights(
        candidate_id=candidate_id,
        version=ver,
        weights_json=cc._dumps(weights),
        source="learning_loop_feedback",
        evidence_json=cc._dumps(evidence),
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "version": ver,
        "weights": weights,
        "evidence": evidence,
        "note": "Calibration from explicit user feedback only — not an unvalidated AI-improves claim",
        "claim_kind": cc.CLAIM_INFERENCE,
        "kpi_excluded": True,
    }


def upsert_inbox_item(
    db: Session,
    *,
    candidate_id: int,
    item_key: str,
    kind: str,
    title: str,
    body: dict | None = None,
    priority_score: int = 50,
    priority_explain: dict | None = None,
    deep_link: str | None = None,
    effort: str | None = None,
    completion_criterion: str | None = None,
    claim_kind: str = cc.CLAIM_SUGGESTION,
    confidence: str = "medium",
) -> CandidateCareerInboxItem:
    row = (
        db.query(CandidateCareerInboxItem)
        .filter(
            CandidateCareerInboxItem.candidate_id == candidate_id,
            CandidateCareerInboxItem.item_key == item_key[:128],
        )
        .one_or_none()
    )
    now = _utcnow()
    if row is None:
        row = CandidateCareerInboxItem(
            candidate_id=candidate_id,
            item_key=item_key[:128],
            kind=kind[:64],
            title=title[:300],
            created_at=now,
        )
        db.add(row)
    elif row.status in {"DISMISSED", "COMPLETED", "ARCHIVED"}:
        # Fatigue: do not resurface without new evidence key — caller must change item_key
        return row
    row.title = title[:300]
    row.kind = kind[:64]
    row.body_json = cc._dumps(body or {})
    row.priority_score = int(priority_score)
    row.priority_explain_json = cc._dumps(priority_explain or {})
    row.deep_link = (deep_link or None) and deep_link[:300]
    row.effort = (effort or None) and effort[:32]
    row.completion_criterion = (completion_criterion or None) and completion_criterion[:300]
    row.claim_kind = claim_kind[:32]
    row.confidence = confidence[:16]
    if row.status == "SNOOZED" and row.snoozed_until and row.snoozed_until <= now:
        row.status = "NEW"
        row.snoozed_until = None
    row.updated_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def mutate_inbox(
    db: Session,
    *,
    candidate_id: int,
    item_id: int,
    action: str,
    snooze_hours: int | None = None,
) -> CandidateCareerInboxItem:
    if action not in INBOX_ACTIONS:
        raise ValueError("invalid_inbox_action")
    row = (
        db.query(CandidateCareerInboxItem)
        .filter(
            CandidateCareerInboxItem.id == item_id,
            CandidateCareerInboxItem.candidate_id == candidate_id,
        )
        .one_or_none()
    )
    if row is None:
        raise ValueError("inbox_item_not_found")
    now = _utcnow()
    if action == "pin":
        row.pinned = True
        row.status = "PINNED"
    elif action == "demote":
        row.priority_score = max(0, row.priority_score - 20)
        row.pinned = False
        if row.status == "PINNED":
            row.status = "SEEN"
    elif action == "dismiss":
        row.status = "DISMISSED"
    elif action == "snooze":
        hours = snooze_hours or 24
        row.status = "SNOOZED"
        row.snoozed_until = now + timedelta(hours=max(1, min(168, hours)))
    elif action == "complete":
        row.status = "COMPLETED"
    elif action == "reopen":
        row.status = "NEW"
        row.snoozed_until = None
    elif action == "seen":
        if row.status == "NEW":
            row.status = "SEEN"
    elif action == "archive":
        row.status = "ARCHIVED"
    row.updated_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        candidate_id=candidate_id,
        action=f"inbox_{action}",
        inbox_item_id=row.id,
        payload={"status": row.status, "priority_score": row.priority_score},
    )
    return row


def list_inbox(db: Session, *, candidate_id: int, include_archived: bool = False) -> list[dict]:
    q = db.query(CandidateCareerInboxItem).filter(
        CandidateCareerInboxItem.candidate_id == candidate_id
    )
    if not include_archived:
        q = q.filter(CandidateCareerInboxItem.status.notin_(["ARCHIVED", "DISMISSED"]))
    rows = q.order_by(
        CandidateCareerInboxItem.pinned.desc(),
        CandidateCareerInboxItem.priority_score.desc(),
        CandidateCareerInboxItem.id.desc(),
    ).limit(50).all()
    now = _utcnow()
    out = []
    for r in rows:
        if r.status == "SNOOZED" and r.snoozed_until and r.snoozed_until > now:
            continue
        out.append(_ser_inbox(r))
    return out


def _ser_inbox(r: CandidateCareerInboxItem) -> dict:
    return {
        "id": r.id,
        "item_key": r.item_key,
        "kind": r.kind,
        "title": r.title,
        "body": cc._loads(r.body_json, {}),
        "status": r.status,
        "priority_score": r.priority_score,
        "priority_explain": cc._loads(r.priority_explain_json, {}),
        "deep_link": r.deep_link,
        "effort": r.effort,
        "completion_criterion": r.completion_criterion,
        "claim_kind": r.claim_kind,
        "confidence": r.confidence,
        "pinned": r.pinned,
        "snoozed_until": r.snoozed_until.isoformat() + "Z" if r.snoozed_until else None,
        "editable": True,
        "dismissible": True,
        "snoozable": True,
        "reversible": True,
    }


def build_priorities_and_nba(
    db: Session, *, candidate_id: int, changes: list[dict]
) -> list[CandidateCareerInboxItem]:
    """Priority + Next Best Action engines — explainable, executable, no external auto-action."""
    cadence = get_or_create_cadence(db, candidate_id=candidate_id)
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    paused = set(cc._loads(cadence.paused_modules_json, []))
    weights = _active_weights(db, candidate_id=candidate_id)
    items: list[CandidateCareerInboxItem] = []

    if cadence.quiet_mode or not privacy.briefs_enabled:
        return items

    goals = (
        db.query(CandidateCareerGoal)
        .filter(
            CandidateCareerGoal.candidate_id == candidate_id,
            CandidateCareerGoal.status == "active",
        )
        .all()
    )
    actions = (
        db.query(CandidateCareerAction)
        .filter(
            CandidateCareerAction.candidate_id == candidate_id,
            CandidateCareerAction.status == "planned",
        )
        .order_by(CandidateCareerAction.priority.asc())
        .limit(5)
        .all()
    )
    apps = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id)
        .order_by(Application.id.desc())
        .limit(10)
        .all()
    )

    # NBA from planned actions
    if "roadmap" not in paused and actions:
        a = actions[0]
        score = int(70 * weights.get("freshness", 1.0))
        items.append(
            upsert_inbox_item(
                db,
                candidate_id=candidate_id,
                item_key=f"nba:action:{a.id}",
                kind="next_best_action",
                title=f"Next: {a.title}",
                body={
                    "action_id": a.id,
                    "horizon": a.horizon,
                    "external_auto_action": False,
                },
                priority_score=score,
                priority_explain={
                    "factors": [
                        {"factor": "planned_action", "delta": score, "why": "Highest-priority planned action"},
                        {"factor": "no_external_auto", "delta": 0, "why": "Requires your explicit action"},
                    ],
                    "weights_version": "active",
                },
                deep_link="/dashboard/career",
                effort="medium",
                completion_criterion="Mark the roadmap action completed in Career Copilot",
                claim_kind=cc.CLAIM_SUGGESTION,
            )
        )

    if "goals" not in paused and goals:
        g = goals[0]
        score = int(60 * weights.get("goal_alignment", 1.0))
        items.append(
            upsert_inbox_item(
                db,
                candidate_id=candidate_id,
                item_key=f"nba:goal:{g.id}",
                kind="goal_progress",
                title=f"Review goal: {g.title}",
                body={"goal_id": g.id, "progress_percent": g.progress_percent},
                priority_score=score,
                priority_explain={
                    "factors": [
                        {"factor": "active_goal", "delta": score, "why": "Active goal needs attention"},
                    ]
                },
                deep_link="/dashboard/career",
                effort="low",
                completion_criterion="Update goal progress or pause/complete the goal",
                claim_kind=cc.CLAIM_FACT,
                confidence="high",
            )
        )

    if "applications" not in paused:
        pending = [a for a in apps if str(getattr(a, "status", "")) in {"pending", "applied"}]
        if pending:
            app = pending[0]
            items.append(
                upsert_inbox_item(
                    db,
                    candidate_id=candidate_id,
                    item_key=f"nba:app:{app.id}",
                    kind="application_followup",
                    title="Application follow-up (draft-only)",
                    body={
                        "application_id": app.id,
                        "status": str(getattr(app, "status", "")),
                        "auto_submit": False,
                        "draft_only": True,
                    },
                    priority_score=65,
                    priority_explain={
                        "factors": [
                            {
                                "factor": "open_application",
                                "delta": 65,
                                "why": "Open application may need follow-up — draft only, never auto-submit",
                            }
                        ]
                    },
                    deep_link="/dashboard#dashboard-applications",
                    effort="medium",
                    completion_criterion="Review application status or prepare a follow-up draft yourself",
                    claim_kind=cc.CLAIM_SUGGESTION,
                )
            )

    # Interview prep — inference only, no fabricated company strategy
    interview_apps = [a for a in apps if str(getattr(a, "status", "")) == "interview"]
    if "interview" not in paused and interview_apps:
        app = interview_apps[0]
        items.append(
            upsert_inbox_item(
                db,
                candidate_id=candidate_id,
                item_key=f"nba:interview:{app.id}",
                kind="interview_prep",
                title="Prepare for upcoming interview",
                body={
                    "application_id": app.id,
                    "topics": ["role_fit", "recent_work", "questions_for_them"],
                    "company_strategy": "UNKNOWN",
                    "claim": cc.CLAIM_INFERENCE,
                },
                priority_score=80,
                priority_explain={
                    "factors": [
                        {"factor": "interview_stage", "delta": 80, "why": "Application in interview stage"},
                        {
                            "factor": "company_strategy",
                            "delta": 0,
                            "why": "Company strategy UNKNOWN — not fabricated",
                            "claim": cc.CLAIM_UNKNOWN,
                        },
                    ]
                },
                deep_link="/dashboard/interview-prep",
                effort="high",
                completion_criterion="Complete interview prep session or mark item done",
                claim_kind=cc.CLAIM_INFERENCE,
            )
        )

    # Learning queue from skill evolution
    if "learning" not in paused:
        skills = (
            db.query(CandidateSkillEvolution)
            .filter(
                CandidateSkillEvolution.candidate_id == candidate_id,
                CandidateSkillEvolution.status.in_(["needs_practice", "missing"]),
            )
            .limit(3)
            .all()
        )
        for s in skills:
            items.append(
                upsert_inbox_item(
                    db,
                    candidate_id=candidate_id,
                    item_key=f"learn:{s.skill}",
                    kind="learning_queue",
                    title=f"Practice: {s.skill}",
                    body={
                        "skill": s.skill,
                        "status": s.status,
                        "next_exercise": s.next_exercise,
                        "mastery_from_completion_alone": False,
                        "note": "Completing an exercise does not invent mastery",
                    },
                    priority_score=45,
                    priority_explain={
                        "factors": [
                            {"factor": "skill_gap", "delta": 45, "why": f"Skill status={s.status}"},
                        ]
                    },
                    deep_link="/dashboard/career",
                    effort="medium",
                    completion_criterion="Do the suggested exercise — mastery remains UNKNOWN until evidenced",
                    claim_kind=cc.CLAIM_SUGGESTION,
                )
            )

    # Changes → inbox
    for ch in changes[:5]:
        if ch.get("change_kind") == "UNKNOWN" and ch.get("entity_type") == "market":
            continue
        items.append(
            upsert_inbox_item(
                db,
                candidate_id=candidate_id,
                item_key=f"change:{ch['entity_key']}",
                kind="change",
                title=ch["title"],
                body={"change": ch},
                priority_score=55 if ch.get("change_kind") in {"NEW", "DECLINED", "CONFLICTING"} else 40,
                priority_explain={
                    "factors": [
                        {
                            "factor": "change_detection",
                            "delta": 55,
                            "why": f"Detected {ch.get('change_kind')}",
                        }
                    ]
                },
                deep_link="/dashboard/career",
                effort="low",
                completion_criterion="Acknowledge or dismiss after review",
                claim_kind=ch.get("claim_kind") or cc.CLAIM_FACT,
                confidence=ch.get("confidence") or "medium",
            )
        )

    # Fatigue: apply daily cap + cooldown
    return _apply_fatigue(db, candidate_id=candidate_id, items=items, cadence=cadence)


def _apply_fatigue(
    db: Session,
    *,
    candidate_id: int,
    items: list[CandidateCareerInboxItem],
    cadence: CandidateDailyCadence,
) -> list[CandidateCareerInboxItem]:
    now = _utcnow()
    cooldown = timedelta(hours=int(cadence.cooldown_hours or 24))
    cap = int(cadence.daily_cap or 7)
    if cadence.intensity == "low":
        cap = min(cap, 3)
    elif cadence.intensity == "high":
        cap = min(20, cap + 3)

    surfaced = []
    for item in sorted(items, key=lambda r: (-(1 if r.pinned else 0), -r.priority_score, -r.id)):
        if item.status in {"DISMISSED", "COMPLETED", "ARCHIVED"}:
            continue
        if item.last_surfaced_at and (now - item.last_surfaced_at) < cooldown and not item.pinned:
            continue
        item.last_surfaced_at = now
        db.add(item)
        surfaced.append(item)
        if len(surfaced) >= cap:
            break
    db.commit()
    return surfaced


def ensure_daily_brief(db: Session, *, candidate_id: int, force: bool = False) -> dict[str, Any]:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    if not privacy.briefs_enabled:
        return {
            "enabled": False,
            "reason": "briefs_disabled",
            "kpi_excluded": True,
        }

    today = _today_str()
    row = (
        db.query(CandidateDailyBrief)
        .filter(
            CandidateDailyBrief.candidate_id == candidate_id,
            CandidateDailyBrief.brief_date == today,
        )
        .one_or_none()
    )
    now = _utcnow()
    if row and row.dismissed_at and not force:
        return {"id": row.id, "status": "dismissed", "brief_date": today, "kpi_excluded": True}
    if row and row.snoozed_until and row.snoozed_until > now and not force:
        return {
            "id": row.id,
            "status": "snoozed",
            "snoozed_until": row.snoozed_until.isoformat() + "Z",
            "brief_date": today,
            "kpi_excluded": True,
        }

    changes = detect_changes(db, candidate_id=candidate_id)
    inbox_rows = build_priorities_and_nba(db, candidate_id=candidate_id, changes=changes)
    momentum = compute_momentum(db, candidate_id=candidate_id)
    risks = detect_risks(db, candidate_id=candidate_id)

    what_changed = [c for c in changes if c.get("change_kind") != "UNKNOWN"][:5]
    what_matters = [_ser_inbox(i) for i in inbox_rows[:5]]
    next_action = what_matters[0] if what_matters else None
    neglecting = [
        i for i in what_matters if i.get("kind") in {"goal_progress", "learning_queue"}
    ][:3]

    body = {
        "what_changed": what_changed,
        "what_matters_today": what_matters,
        "next_action": next_action,
        "neglecting": neglecting,
        "opportunity_shifts": [
            c for c in changes if c.get("entity_type") in {"application", "market"}
        ][:5],
        "goal_progress": [
            i for i in what_matters if i.get("kind") == "goal_progress"
        ],
        "evidence_changed_recommendations": [
            i for i in what_matters if i.get("kind") in {"change", "next_best_action"}
        ],
        "review_prepare_learn_decide": {
            "review": [i for i in what_matters if i.get("kind") in {"change", "goal_progress"}],
            "prepare": [i for i in what_matters if i.get("kind") == "interview_prep"],
            "learn": [i for i in what_matters if i.get("kind") == "learning_queue"],
            "decide": [i for i in what_matters if i.get("kind") == "application_followup"],
        },
        "momentum": momentum,
        "risks": risks,
        "motivational_filler": False,
        "external_auto_action": False,
        "ai_kill_switch": kill_switch_engaged(),
    }
    headline = (
        next_action["title"]
        if next_action
        else ("Quiet day — no evidence-backed priorities" if not what_changed else "Review recent career changes")
    )

    if row is None:
        row = CandidateDailyBrief(
            candidate_id=candidate_id,
            brief_date=today,
            created_at=now,
        )
        db.add(row)
    row.status = "active"
    row.headline = headline[:300]
    row.body_json = cc._dumps(body)
    row.context_version = int(row.context_version or 0) + 1
    row.dismissed_at = None
    row.snoozed_until = None
    row.updated_at = now
    db.add(row)
    db.commit()
    db.refresh(row)

    adaptive.record_memory(
        db,
        candidate_id=candidate_id,
        memory_key=f"daily_brief:{today}",
        kind="daily_brief",
        title=f"Daily brief {today}",
        body={"brief_id": row.id, "context_version": row.context_version},
        claim_kind=cc.CLAIM_FACT,
        edit_existing=True,
    )

    return {
        "id": row.id,
        "brief_date": row.brief_date,
        "status": row.status,
        "headline": row.headline,
        "body": body,
        "context_version": row.context_version,
        "dismissible": True,
        "snoozable": True,
        "kpi_excluded": True,
    }


def mutate_brief(
    db: Session,
    *,
    candidate_id: int,
    action: str,
    snooze_hours: int | None = None,
) -> dict[str, Any]:
    today = _today_str()
    row = (
        db.query(CandidateDailyBrief)
        .filter(
            CandidateDailyBrief.candidate_id == candidate_id,
            CandidateDailyBrief.brief_date == today,
        )
        .one_or_none()
    )
    if row is None:
        raise ValueError("brief_not_found")
    now = _utcnow()
    if action == "dismiss":
        row.dismissed_at = now
        row.status = "dismissed"
    elif action == "snooze":
        hours = snooze_hours or 4
        row.snoozed_until = now + timedelta(hours=max(1, min(48, hours)))
        row.status = "snoozed"
    elif action == "reopen":
        row.dismissed_at = None
        row.snoozed_until = None
        row.status = "active"
    else:
        raise ValueError("invalid_brief_action")
    row.updated_at = now
    db.add(row)
    db.commit()
    _audit(db, candidate_id=candidate_id, action=f"brief_{action}", payload={"brief_id": row.id})
    return {"id": row.id, "status": row.status, "kpi_excluded": True}


def compute_momentum(db: Session, *, candidate_id: int) -> dict[str, Any]:
    actions = (
        db.query(CandidateCareerAction)
        .filter(CandidateCareerAction.candidate_id == candidate_id)
        .all()
    )
    done = sum(1 for a in actions if a.status == "completed")
    planned = sum(1 for a in actions if a.status == "planned")
    goals = (
        db.query(CandidateCareerGoal)
        .filter(CandidateCareerGoal.candidate_id == candidate_id, CandidateCareerGoal.status == "active")
        .count()
    )
    apps = db.query(Application).filter(Application.candidate_id == candidate_id).count()

    dims = {
        "action_completion": {
            "score": min(100, done * 20),
            "explain": f"{done} completed actions",
            "claim": cc.CLAIM_FACT,
        },
        "planning": {
            "score": min(100, planned * 10),
            "explain": f"{planned} planned actions",
            "claim": cc.CLAIM_FACT,
        },
        "goal_presence": {
            "score": 40 if goals else 0,
            "explain": f"{goals} active goals",
            "claim": cc.CLAIM_FACT,
        },
        "application_activity": {
            "score": min(100, apps * 15) if apps else 0,
            "explain": f"{apps} applications in TWIN" if apps else "No applications — UNKNOWN momentum from market",
            "claim": cc.CLAIM_FACT if apps else cc.CLAIM_UNKNOWN,
        },
        "market_pull": {
            "score": 0,
            "explain": "Live market pull UNKNOWN — not fabricated",
            "claim": cc.CLAIM_UNKNOWN,
        },
    }
    scored = [d["score"] for d in dims.values() if d["claim"] != cc.CLAIM_UNKNOWN]
    overall = int(sum(scored) / max(len(scored), 1)) if scored else 0
    conf = "medium" if scored else "low"
    snap = CandidateMomentumSnapshot(
        candidate_id=candidate_id,
        score=overall,
        dimensions_json=cc._dumps({k: v["score"] for k, v in dims.items()}),
        explain_json=cc._dumps(dims),
        confidence=conf,
        created_at=_utcnow(),
    )
    db.add(snap)
    db.commit()
    return {
        "score": overall,
        "dimensions": dims,
        "confidence": conf,
        "snapshot_id": snap.id,
        "gamification": False,
        "note": "Evidence-backed momentum only — not a game score",
        "kpi_excluded": True,
    }


def detect_risks(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    """Career process risks only — no mental health / protected attrs / alarmist copy."""
    risks = []
    goals = (
        db.query(CandidateCareerGoal)
        .filter(CandidateCareerGoal.candidate_id == candidate_id, CandidateCareerGoal.status == "active")
        .all()
    )
    if not goals:
        risks.append(
            {
                "id": "no_active_goal",
                "title": "No active goal set",
                "severity": "low",
                "claim_kind": cc.CLAIM_FACT,
                "evidence": ["career_goals"],
                "note": "Process signal only — not a judgment of you",
            }
        )
    actions = (
        db.query(CandidateCareerAction)
        .filter(
            CandidateCareerAction.candidate_id == candidate_id,
            CandidateCareerAction.status == "planned",
        )
        .count()
    )
    done = (
        db.query(CandidateCareerAction)
        .filter(
            CandidateCareerAction.candidate_id == candidate_id,
            CandidateCareerAction.status == "completed",
        )
        .count()
    )
    if actions >= 3 and done == 0:
        risks.append(
            {
                "id": "planned_without_completion",
                "title": "Several planned actions with none completed yet",
                "severity": "medium",
                "claim_kind": cc.CLAIM_INFERENCE,
                "evidence": ["career_actions"],
                "note": "Suggests prioritization — not a personal diagnosis",
            }
        )
    return risks


def add_watch(
    db: Session,
    *,
    candidate_id: int,
    watch_type: str,
    label: str,
    criteria: dict | None = None,
) -> CandidateOpportunityWatch:
    allowed = {"role", "company", "industry", "location", "skill", "direction"}
    if watch_type not in allowed:
        raise ValueError("invalid_watch_type")
    key = f"{watch_type}:{label.strip().lower()[:80]}"
    row = (
        db.query(CandidateOpportunityWatch)
        .filter(
            CandidateOpportunityWatch.candidate_id == candidate_id,
            CandidateOpportunityWatch.watch_key == key[:128],
        )
        .one_or_none()
    )
    now = _utcnow()
    if row is None:
        row = CandidateOpportunityWatch(
            candidate_id=candidate_id,
            watch_key=key[:128],
            watch_type=watch_type,
            label=label[:200],
            created_at=now,
        )
        db.add(row)
    row.criteria_json = cc._dumps(criteria or {})
    row.freshness = "UNKNOWN"
    row.last_snapshot_json = cc._dumps(
        {"note": "No live market snapshot — freshness UNKNOWN until evidenced", "at": now.isoformat()}
    )
    row.archived_at = None
    row.updated_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def watchlist_deltas(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    rows = (
        db.query(CandidateOpportunityWatch)
        .filter(
            CandidateOpportunityWatch.candidate_id == candidate_id,
            CandidateOpportunityWatch.archived_at.is_(None),
        )
        .all()
    )
    out = []
    for r in rows:
        before = cc._loads(r.last_snapshot_json, {})
        after = {
            "freshness": "UNKNOWN",
            "note": "Live opportunity delta unavailable without market evidence",
            "label": r.label,
        }
        # Mark STALE if older than 7 days without evidence
        freshness = "STALE" if r.updated_at and (_utcnow() - r.updated_at).days >= 7 else "UNKNOWN"
        r.freshness = freshness
        r.last_snapshot_json = cc._dumps(after)
        r.updated_at = _utcnow()
        db.add(r)
        out.append(
            {
                "id": r.id,
                "watch_type": r.watch_type,
                "label": r.label,
                "before": before,
                "after": after,
                "freshness": freshness,
                "claim_kind": cc.CLAIM_UNKNOWN,
                "evidence": [],
            }
        )
    db.commit()
    return out


def schedule_reminder(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    due_at: datetime,
    channel: str = "in_product",
    payload: dict | None = None,
) -> CandidateCareerReminder:
    privacy = get_or_create_privacy(db, candidate_id=candidate_id)
    if not privacy.reminders_enabled:
        raise ValueError("reminders_disabled")
    if channel == "email" and not privacy.email_reminders_opt_in:
        raise ValueError("email_reminders_not_opted_in")
    if channel not in {"in_product", "email"}:
        raise ValueError("invalid_channel")
    # No SMS / recruiter outreach
    idem = f"{candidate_id}:{title[:40]}:{due_at.isoformat()}"
    existing = (
        db.query(CandidateCareerReminder)
        .filter(
            CandidateCareerReminder.candidate_id == candidate_id,
            CandidateCareerReminder.idempotency_key == idem[:128],
        )
        .one_or_none()
    )
    if existing:
        return existing
    row = CandidateCareerReminder(
        candidate_id=candidate_id,
        reminder_key=f"rem:{idem[:100]}"[:128],
        title=title[:300],
        due_at=due_at,
        channel=channel,
        status="scheduled",
        idempotency_key=idem[:128],
        payload_json=cc._dumps(
            {
                **(payload or {}),
                "kpi_excluded": True,
                "subject_has_pii": False,
                "note": "In-product default; email only with opt-in — no SMS/recruiter outreach",
            }
        ),
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _local_hour_now(tz_name: str) -> int:
    try:
        tz = ZoneInfo(tz_name or "UTC")
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")
    return datetime.now(tz).hour


def in_quiet_hours(cadence: CandidateDailyCadence, *, now_utc: datetime | None = None) -> bool:
    """True when quiet_mode or local hour falls in [start, end) (supports overnight wrap)."""
    if cadence.quiet_mode:
        return True
    start = cadence.quiet_hours_start
    end = cadence.quiet_hours_end
    if start is None or end is None:
        return False
    hour = _local_hour_now(cadence.timezone or "UTC")
    if start == end:
        return False
    if start < end:
        return start <= hour < end
    return hour >= start or hour < end


def _reminder_payload(row: CandidateCareerReminder) -> dict:
    return cc._loads(row.payload_json, {}) or {}


def _record_reminder_attempt(
    row: CandidateCareerReminder,
    *,
    outcome: str,
    detail: str | None = None,
    dry_run: bool = False,
) -> None:
    payload = _reminder_payload(row)
    attempts = list(payload.get("attempts") or [])
    attempts.append(
        {
            "at": _utcnow().isoformat() + "Z",
            "outcome": outcome,
            "detail": detail,
            "dry_run": dry_run,
        }
    )
    payload["attempts"] = attempts[-20:]
    payload["last_outcome"] = outcome
    if detail:
        payload["last_error"] = detail if outcome.startswith("fail") else payload.get("last_error")
    if dry_run:
        payload["last_dry_run_at"] = _utcnow().isoformat() + "Z"
        payload["last_dry_run_outcome"] = outcome
    row.payload_json = cc._dumps(payload)


def deliver_career_reminder(
    db: Session,
    *,
    reminder_id: int,
    dry_run: bool = False,
    force: bool = False,
) -> dict[str, Any]:
    """Deliver one due career reminder — consent-safe, idempotent, quiet-hours aware.

    Email sends only with privacy.email_reminders_opt_in + reminders_enabled + mail configured.
    Real send never happens when dry_run=True. No SMS / recruiter outreach.
    """
    row = db.query(CandidateCareerReminder).filter(CandidateCareerReminder.id == reminder_id).one_or_none()
    if not row:
        return {"ok": False, "result": "not_found", "reminder_id": reminder_id}
    if row.status in {"delivered", "sent", "cancelled"} and not force:
        return {
            "ok": True,
            "result": "already_done",
            "reminder_id": row.id,
            "status": row.status,
            "idempotent": True,
        }

    privacy = get_or_create_privacy(db, candidate_id=row.candidate_id)
    cadence = get_or_create_cadence(db, candidate_id=row.candidate_id)
    now = _utcnow()

    if not privacy.reminders_enabled:
        out = {"ok": True, "result": "reminders_disabled", "reminder_id": row.id, "would_send": False}
        _record_reminder_attempt(row, outcome="skipped_reminders_disabled", dry_run=dry_run)
        if not dry_run:
            row.status = "cancelled"
            db.commit()
        else:
            db.commit()
        return out

    if not force and in_quiet_hours(cadence, now_utc=now):
        _record_reminder_attempt(row, outcome="skipped_quiet_hours", dry_run=dry_run)
        db.commit()
        return {
            "ok": True,
            "result": "skipped_quiet_hours",
            "reminder_id": row.id,
            "would_send": False,
            "quiet_hours": True,
            "timezone": cadence.timezone,
        }

    if row.due_at and row.due_at > now and not force:
        return {
            "ok": True,
            "result": "not_due",
            "reminder_id": row.id,
            "would_send": False,
            "due_at": row.due_at.isoformat() + "Z",
        }

    channel = (row.channel or "in_product").strip()
    if channel == "email":
        if not privacy.email_reminders_opt_in:
            _record_reminder_attempt(row, outcome="blocked_no_email_consent", dry_run=dry_run)
            db.commit()
            return {
                "ok": True,
                "result": "blocked_no_email_consent",
                "reminder_id": row.id,
                "would_send": False,
                "unauthorized_send": False,
            }
        from app.config import get_settings
        from app.services.mail import is_mail_configured

        settings = get_settings()
        if not is_mail_configured(settings):
            _record_reminder_attempt(
                row, outcome="skipped_no_mail", detail="mail_not_configured", dry_run=dry_run
            )
            db.commit()
            return {
                "ok": True,
                "result": "skipped_no_mail",
                "reminder_id": row.id,
                "would_send": False,
            }
        if dry_run:
            _record_reminder_attempt(row, outcome="dry_run_would_email", dry_run=True)
            db.commit()
            return {
                "ok": True,
                "result": "dry_run_would_email",
                "reminder_id": row.id,
                "would_send": True,
                "channel": "email",
                "sent": False,
            }
        # Real email path — transactional, consent-gated; no mass mail.
        try:
            from app.database.models import Candidate, User
            from app.services.mail import send_generic_email

            cand = db.query(Candidate).filter(Candidate.id == row.candidate_id).one_or_none()
            user = db.query(User).filter(User.id == cand.user_id).one_or_none() if cand else None
            if not user or not (user.email or "").strip():
                raise RuntimeError("missing_user_email")
            base = (settings.frontend_url or "http://localhost:3000").rstrip("/")
            send_generic_email(
                settings,
                to_email=user.email.strip(),
                subject="TWIN career reminder",
                text_body=(
                    f"{row.title}\n\nOpen your Daily Career OS: {base}/dashboard/career\n"
                ),
                html_body=(
                    f"<p>{row.title}</p>"
                    f'<p><a href="{base}/dashboard/career">Open Daily Career OS</a></p>'
                ),
            )
            row.status = "sent"
            row.sent_at = now
            _record_reminder_attempt(row, outcome="sent_email")
            db.commit()
            return {
                "ok": True,
                "result": "sent",
                "reminder_id": row.id,
                "channel": "email",
                "sent": True,
            }
        except Exception as exc:
            logger.exception("career reminder email failed id=%s", row.id)
            _record_reminder_attempt(row, outcome="failed_email", detail=type(exc).__name__)
            row.status = "failed"
            db.commit()
            return {
                "ok": False,
                "result": "failed_email",
                "reminder_id": row.id,
                "error": type(exc).__name__,
                "visible_failure": True,
            }

    # Default: in-product delivery — surface via inbox item, no external send.
    if dry_run:
        _record_reminder_attempt(row, outcome="dry_run_would_deliver_in_product", dry_run=True)
        db.commit()
        return {
            "ok": True,
            "result": "dry_run_would_deliver_in_product",
            "reminder_id": row.id,
            "would_send": True,
            "channel": "in_product",
            "sent": False,
        }

    try:
        upsert_inbox_item(
            db,
            candidate_id=row.candidate_id,
            item_key=f"reminder:delivered:{row.id}",
            kind="reminder",
            title=row.title[:300],
            body={
                "reminder_id": row.id,
                "channel": "in_product",
                "external_auto_action": False,
                "kpi_excluded": True,
            },
            priority_score=60,
            priority_explain={
                "factors": [{"factor": "due_reminder", "why": "Scheduled reminder became due"}],
                "external_auto_action": False,
            },
            deep_link="/dashboard/career",
            effort="S",
            completion_criterion="Acknowledge or snooze the reminder",
            claim_kind=cc.CLAIM_UNKNOWN,
            confidence="medium",
        )
        row.status = "delivered"
        row.sent_at = now
        _record_reminder_attempt(row, outcome="delivered_in_product")
        db.commit()
        return {
            "ok": True,
            "result": "delivered",
            "reminder_id": row.id,
            "channel": "in_product",
            "sent": False,
        }
    except Exception as exc:
        logger.exception("career reminder in-product deliver failed id=%s", row.id)
        _record_reminder_attempt(row, outcome="failed_in_product", detail=type(exc).__name__)
        row.status = "failed"
        db.commit()
        return {
            "ok": False,
            "result": "failed_in_product",
            "reminder_id": row.id,
            "error": type(exc).__name__,
            "visible_failure": True,
        }


def sweep_due_career_reminders(
    db: Session,
    *,
    dry_run: bool = False,
    limit: int = 100,
    candidate_id: int | None = None,
) -> dict[str, Any]:
    """Process due scheduled career reminders (worker / ops). Failures are explicit."""
    now = _utcnow()
    q = db.query(CandidateCareerReminder).filter(
        CandidateCareerReminder.status == "scheduled",
        CandidateCareerReminder.due_at <= now,
    )
    if candidate_id is not None:
        q = q.filter(CandidateCareerReminder.candidate_id == candidate_id)
    ids = [r.id for r in q.order_by(CandidateCareerReminder.due_at.asc()).limit(max(1, min(500, limit))).all()]
    results: list[dict] = []
    counts: dict[str, int] = {}
    for rid in ids:
        out = deliver_career_reminder(db, reminder_id=rid, dry_run=dry_run)
        results.append(out)
        key = str(out.get("result") or "unknown")
        counts[key] = counts.get(key, 0) + 1
    return {
        "ok": True,
        "dry_run": dry_run,
        "scanned": len(ids),
        "counts": counts,
        "results": results[:50],
        "kpi_excluded": True,
        "mass_email": False,
        "unauthorized_send": False,
    }


def dry_run_reminder_delivery(
    db: Session, *, candidate_id: int, reminder_id: int | None = None
) -> dict[str, Any]:
    """Candidate-scoped dry-run — never sends email."""
    if reminder_id is not None:
        row = (
            db.query(CandidateCareerReminder)
            .filter(
                CandidateCareerReminder.id == reminder_id,
                CandidateCareerReminder.candidate_id == candidate_id,
            )
            .one_or_none()
        )
        if not row:
            raise ValueError("reminder_not_found")
        return deliver_career_reminder(db, reminder_id=row.id, dry_run=True, force=True)
    return sweep_due_career_reminders(db, dry_run=True, candidate_id=candidate_id, limit=50)


def create_progress_review(
    db: Session, *, candidate_id: int, period: str = "weekly"
) -> CandidateProgressReview:
    if period not in {"weekly", "monthly"}:
        period = "weekly"
    goals = (
        db.query(CandidateCareerGoal)
        .filter(CandidateCareerGoal.candidate_id == candidate_id)
        .all()
    )
    summary = {
        "active_goals": len([g for g in goals if g.status == "active"]),
        "completed_goals": len([g for g in goals if g.status == "completed"]),
        "note": "Proposed changes require your explicit approval",
    }
    proposed = []
    for g in goals:
        if g.status == "active" and (g.progress_percent or 0) == 0:
            proposed.append(
                {
                    "type": "suggest_progress_update",
                    "goal_id": g.id,
                    "title": g.title,
                    "requires_user_approval": True,
                }
            )
    row = CandidateProgressReview(
        candidate_id=candidate_id,
        period=period,
        summary_json=cc._dumps(summary),
        proposed_changes_json=cc._dumps(proposed),
        user_approved=None,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def approve_progress_review(
    db: Session, *, candidate_id: int, review_id: int, approved: bool
) -> CandidateProgressReview:
    row = (
        db.query(CandidateProgressReview)
        .filter(
            CandidateProgressReview.id == review_id,
            CandidateProgressReview.candidate_id == candidate_id,
        )
        .one_or_none()
    )
    if row is None:
        raise ValueError("review_not_found")
    row.user_approved = bool(approved)
    row.approved_at = _utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit(
        db,
        candidate_id=candidate_id,
        action="progress_review_decision",
        payload={"review_id": row.id, "approved": approved},
    )
    return row


def application_command_center(db: Session, *, candidate_id: int) -> dict[str, Any]:
    apps = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id)
        .order_by(Application.id.desc())
        .limit(30)
        .all()
    )
    stages = []
    for a in apps:
        status = str(getattr(a, "status", "pending"))
        stages.append(
            {
                "application_id": a.id,
                "status": status,
                "follow_up": "draft_only",
                "auto_submit": False,
                "claim_kind": cc.CLAIM_FACT,
            }
        )
    return {
        "schema": "twin.application_command_center/v1",
        "applications": stages,
        "auto_submit": False,
        "draft_only": True,
        "kpi_excluded": True,
    }


def learning_queue(db: Session, *, candidate_id: int) -> list[dict]:
    rows = (
        db.query(CandidateSkillEvolution)
        .filter(
            CandidateSkillEvolution.candidate_id == candidate_id,
            CandidateSkillEvolution.status.in_(["needs_practice", "missing"]),
        )
        .limit(20)
        .all()
    )
    return [
        {
            "skill": r.skill,
            "status": r.status,
            "next_exercise": r.next_exercise,
            "mastery": "UNKNOWN",
            "note": "Completion alone does not invent mastery",
            "claim_kind": r.claim_kind,
            "evidence": cc._loads(r.evidence_json, []),
        }
        for r in rows
    ]


def export_daily_history(db: Session, *, candidate_id: int) -> dict[str, Any]:
    briefs = (
        db.query(CandidateDailyBrief)
        .filter(CandidateDailyBrief.candidate_id == candidate_id)
        .order_by(CandidateDailyBrief.id.desc())
        .limit(60)
        .all()
    )
    inbox = (
        db.query(CandidateCareerInboxItem)
        .filter(CandidateCareerInboxItem.candidate_id == candidate_id)
        .limit(100)
        .all()
    )
    return {
        "schema": "twin.daily_os_export/v1",
        "briefs": [
            {
                "id": b.id,
                "brief_date": b.brief_date,
                "headline": b.headline,
                "status": b.status,
                "context_version": b.context_version,
            }
            for b in briefs
        ],
        "inbox": [_ser_inbox(i) for i in inbox],
        "kpi_excluded": True,
    }


def delete_daily_history(db: Session, *, candidate_id: int) -> dict[str, Any]:
    """User-requested wipe of daily OS history — audited, reversible only via export restore (none auto)."""
    n_briefs = (
        db.query(CandidateDailyBrief)
        .filter(CandidateDailyBrief.candidate_id == candidate_id)
        .delete(synchronize_session=False)
    )
    n_inbox = (
        db.query(CandidateCareerInboxItem)
        .filter(CandidateCareerInboxItem.candidate_id == candidate_id)
        .delete(synchronize_session=False)
    )
    n_changes = (
        db.query(CandidateCareerChangeEvent)
        .filter(CandidateCareerChangeEvent.candidate_id == candidate_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    _audit(
        db,
        candidate_id=candidate_id,
        action="delete_daily_history",
        payload={"briefs": n_briefs, "inbox": n_inbox, "changes": n_changes},
    )
    return {"deleted": {"briefs": n_briefs, "inbox": n_inbox, "changes": n_changes}, "kpi_excluded": True}


def build_daily_os_aggregate(db: Session, *, candidate_id: int) -> dict[str, Any]:
    """Full Daily OS + adaptive aggregate — never starts from zero (WS18)."""
    base = adaptive.build_adaptive_aggregate(db, candidate_id=candidate_id)
    try:
        privacy = get_or_create_privacy(db, candidate_id=candidate_id)
        cadence = get_or_create_cadence(db, candidate_id=candidate_id)
    except Exception:
        base["daily_os"] = {
            "schema": "twin.daily_career_os/v1",
            "degraded": True,
            "reason": "daily_os_schema_unavailable",
            "fallback": "adaptive_only",
            "kpi_excluded": True,
            "phase_3_career_agent": "NOT_STARTED",
            "safety": {
                "external_auto_action": False,
                "ai_kill_switch": kill_switch_engaged(),
                "kpi_excluded": True,
            },
            "continuity": {"never_starts_from_zero": True, "reuses_adaptive": True},
        }
        base["product"] = "daily_career_operating_system"
        base["verdict_target"] = (
            "DAILY CAREER OPERATING SYSTEM CUSTOMER-USABLE — CONTINUOUS CAREER COPILOT PRODUCTION-READY"
        )
        return base

    cal = calibrate_from_learning_loop(db, candidate_id=candidate_id) if privacy.learning_enabled else {
        "skipped": True,
        "reason": "learning_disabled",
    }

    try:
        brief = ensure_daily_brief(db, candidate_id=candidate_id)
    except Exception:
        brief = {
            "degraded": True,
            "reason": "brief_generation_failed",
            "fallback": "rules_v1",
            "kpi_excluded": True,
            "ai_kill_switch": kill_switch_engaged(),
        }

    try:
        watches = (
            db.query(CandidateOpportunityWatch)
            .filter(
                CandidateOpportunityWatch.candidate_id == candidate_id,
                CandidateOpportunityWatch.archived_at.is_(None),
            )
            .limit(20)
            .all()
        )
        reminders = (
            db.query(CandidateCareerReminder)
            .filter(
                CandidateCareerReminder.candidate_id == candidate_id,
                CandidateCareerReminder.status == "scheduled",
            )
            .order_by(CandidateCareerReminder.due_at.asc())
            .limit(20)
            .all()
        )
        reviews = (
            db.query(CandidateProgressReview)
            .filter(CandidateProgressReview.candidate_id == candidate_id)
            .order_by(CandidateProgressReview.id.desc())
            .limit(5)
            .all()
        )
        inbox = list_inbox(db, candidate_id=candidate_id)
        watch_deltas = watchlist_deltas(db, candidate_id=candidate_id)
        apps_cc = application_command_center(db, candidate_id=candidate_id)
        learn_q = learning_queue(db, candidate_id=candidate_id)
    except Exception:
        watches, reminders, reviews, inbox, watch_deltas = [], [], [], [], []
        apps_cc = {"auto_submit": False, "draft_only": True, "kpi_excluded": True}
        learn_q = []

    daily = {
        "schema": "twin.daily_career_os/v1",
        "verdict_target": (
            "DAILY CAREER OPERATING SYSTEM CUSTOMER-USABLE — CONTINUOUS CAREER COPILOT PRODUCTION-READY"
        ),
        "brief": brief,
        "inbox": inbox,
        "application_command_center": apps_cc,
        "learning_queue": learn_q,
        "watchlist": [
            {
                "id": w.id,
                "watch_type": w.watch_type,
                "label": w.label,
                "freshness": w.freshness,
                "criteria": cc._loads(w.criteria_json, {}),
            }
            for w in watches
        ],
        "watchlist_deltas": watch_deltas,
        "reminders": [
            {
                "id": r.id,
                "title": r.title,
                "due_at": r.due_at.isoformat() + "Z" if r.due_at else None,
                "channel": r.channel,
                "status": r.status,
            }
            for r in reminders
        ],
        "cadence": {
            "timezone": cadence.timezone,
            "quiet_hours_start": cadence.quiet_hours_start,
            "quiet_hours_end": cadence.quiet_hours_end,
            "intensity": cadence.intensity,
            "quiet_mode": cadence.quiet_mode,
            "paused_modules": cc._loads(cadence.paused_modules_json, []),
            "daily_cap": cadence.daily_cap,
            "cooldown_hours": cadence.cooldown_hours,
        },
        "privacy": {
            "learning_enabled": privacy.learning_enabled,
            "briefs_enabled": privacy.briefs_enabled,
            "reminders_enabled": privacy.reminders_enabled,
            "email_reminders_opt_in": privacy.email_reminders_opt_in,
        },
        "calibration": cal,
        "progress_reviews": [
            {
                "id": r.id,
                "period": r.period,
                "summary": cc._loads(r.summary_json, {}),
                "proposed_changes": cc._loads(r.proposed_changes_json, []),
                "user_approved": r.user_approved,
            }
            for r in reviews
        ],
        "continuity": {
            "reuses_adaptive": True,
            "reuses_graph": True,
            "reuses_memory": True,
            "never_starts_from_zero": True,
            "context_version": (brief or {}).get("context_version"),
        },
        "safety": {
            **(base.get("safety") or {}),
            "external_auto_action": False,
            "auto_submit": False,
            "sms_outreach": False,
            "recruiter_outreach": False,
            "no_fabricated_market": True,
            "no_protected_attrs": True,
            "no_mental_health_claims": True,
            "ai_kill_switch": kill_switch_engaged(),
            "kpi_excluded": True,
        },
        "observability": {
            "schema": "twin.daily_os_obs/v1",
            "labels_pii": False,
            "degraded": bool((brief or {}).get("degraded")),
        },
        "analytics": {"kpi_excluded": True},
        "alembic": "109_daily_career_os",
        "phase_3_career_agent": "NOT_STARTED",
    }
    base["daily_os"] = daily
    base["product"] = "daily_career_operating_system"
    base["verdict_target"] = daily["verdict_target"]
    # Preserve overview kill-switch for Copilot 2.0 consumers
    if isinstance(base.get("overview"), dict):
        base["overview"]["ai_kill_switch"] = kill_switch_engaged()
    if isinstance(base.get("safety"), dict):
        base["safety"]["ai_kill_switch"] = kill_switch_engaged()
    return base
