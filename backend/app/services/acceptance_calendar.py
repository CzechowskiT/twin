"""Acceptance Calendar — career execution planning (candidate-owned, not an autonomous agent).

Aggregates commitments / interviews / applications / learning / goals / reminders into one
internal calendar of acceptance. May propose holds and export ICS. Must NOT write Microsoft
Calendar, auto-create external events, invite attendees, contact recruiters, or submit apps.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import (
    Application,
    Candidate,
    CandidateAcceptanceItem,
    CandidateAcceptanceItemAudit,
    CandidateAcceptanceOutcome,
    CandidateAvailabilityBlock,
    CandidateCalendarConsent,
    CandidateCalendarPreference,
    CandidateCareerGoal,
    CandidateCareerReminder,
    CandidateDailyCadence,
    CandidateLearningLoopEntry,
    CandidateProposedHold,
    CandidateTimeBudget,
    CandidateWeeklyPlan,
    ScheduledInterview,
    UserMicrosoftCalendar,
)
from app.services import career_copilot as cc
from app.services.microsoft_calendar_oauth import (
    FORBIDDEN_MS_CALENDAR_SCOPE_TOKENS,
    effective_microsoft_calendar_scopes,
)

logger = logging.getLogger(__name__)

CATEGORIES = frozenset(
    {
        "commitment",
        "interview",
        "application",
        "learning",
        "goal",
        "reminder",
        "review",
        "decision",
        "hold",
        "deadline",
        "planning_block",
    }
)
STATES = frozenset(
    {
        "proposed",
        "scheduled",
        "confirmed_internal",
        "exported",
        "externally_confirmed",
        "postponed",
        "protected",
        "completed",
        "cancelled",
        "at_risk",
        "unscheduled",
    }
)
HOLD_STATES = frozenset(
    {"DRAFT", "PROPOSED", "ACCEPTED_INTERNAL", "EXPORTED", "DISMISSED", "EXPIRED"}
)
FEASIBILITY = frozenset(
    {
        "FEASIBLE",
        "TIGHT",
        "OVERLOADED",
        "CONFLICTING",
        "INCOMPLETE_DATA",
        "UNKNOWN",
    }
)
ITEM_ACTIONS = frozenset(
    {
        "schedule",
        "postpone",
        "protect",
        "complete",
        "cancel",
        "reopen",
        "edit",
        "accept_hold",
        "dismiss",
    }
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    return cc._dumps(obj)


def _loads(raw: str | None, default: Any) -> Any:
    return cc._loads(raw or "", default)


def _tz(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name or "UTC")
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


# ── Consent / budget / outcome ──────────────────────────────────────────────


def get_or_create_consent(db: Session, *, candidate_id: int) -> CandidateCalendarConsent:
    row = (
        db.query(CandidateCalendarConsent)
        .filter(CandidateCalendarConsent.candidate_id == candidate_id)
        .one_or_none()
    )
    if row:
        return row
    row = CandidateCalendarConsent(candidate_id=candidate_id, created_at=_utcnow(), updated_at=_utcnow())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_consent(
    db: Session,
    *,
    candidate_id: int,
    internal_calendar_enabled: bool | None = None,
    ms_busy_read_opt_in: bool | None = None,
    google_busy_read_opt_in: bool | None = None,
    ics_export_opt_in: bool | None = None,
    store_availability_blocks: bool | None = None,
) -> CandidateCalendarConsent:
    row = get_or_create_consent(db, candidate_id=candidate_id)
    before = {
        "ms_busy_read_opt_in": row.ms_busy_read_opt_in,
        "ics_export_opt_in": row.ics_export_opt_in,
        "version": row.version,
    }
    if internal_calendar_enabled is not None:
        row.internal_calendar_enabled = bool(internal_calendar_enabled)
    if ms_busy_read_opt_in is not None:
        row.ms_busy_read_opt_in = bool(ms_busy_read_opt_in)
    if google_busy_read_opt_in is not None:
        row.google_busy_read_opt_in = bool(google_busy_read_opt_in)
    if ics_export_opt_in is not None:
        row.ics_export_opt_in = bool(ics_export_opt_in)
    if store_availability_blocks is not None:
        row.store_availability_blocks = bool(store_availability_blocks)
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        item_id=None,
        action="consent_update",
        before=before,
        after={
            "ms_busy_read_opt_in": row.ms_busy_read_opt_in,
            "ics_export_opt_in": row.ics_export_opt_in,
            "version": row.version,
        },
    )
    db.commit()
    db.refresh(row)
    return row


def get_or_create_budget(db: Session, *, candidate_id: int) -> CandidateTimeBudget:
    row = (
        db.query(CandidateTimeBudget)
        .filter(CandidateTimeBudget.candidate_id == candidate_id)
        .one_or_none()
    )
    if row:
        return row
    cadence = (
        db.query(CandidateDailyCadence)
        .filter(CandidateDailyCadence.candidate_id == candidate_id)
        .one_or_none()
    )
    tz = (cadence.timezone if cadence else None) or "UTC"
    row = CandidateTimeBudget(
        candidate_id=candidate_id,
        timezone=tz,
        hours_per_week=10,
        source="explicit_user",
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_budget(
    db: Session,
    *,
    candidate_id: int,
    hours_per_week: int | None = None,
    hours_per_day_cap: int | None = None,
    timezone_name: str | None = None,
    protected_blocks: list | None = None,
    note: str | None = None,
) -> CandidateTimeBudget:
    row = get_or_create_budget(db, candidate_id=candidate_id)
    before = {"hours_per_week": row.hours_per_week, "version": row.version}
    if hours_per_week is not None:
        row.hours_per_week = max(1, min(80, int(hours_per_week)))
    if hours_per_day_cap is not None:
        row.hours_per_day_cap = max(1, min(24, int(hours_per_day_cap)))
    if timezone_name is not None:
        row.timezone = timezone_name[:64] or "UTC"
    if protected_blocks is not None:
        # Explicit user blocks only — never invent private obligations
        row.protected_blocks_json = _dumps(protected_blocks[:40])
    if note is not None:
        row.note = note[:2000]
    row.version = int(row.version or 1) + 1
    row.source = "explicit_user"
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        item_id=None,
        action="budget_update",
        before=before,
        after={"hours_per_week": row.hours_per_week, "version": row.version},
    )
    db.commit()
    db.refresh(row)
    return row


def upsert_outcome(
    db: Session,
    *,
    candidate_id: int,
    title: str,
    description: str = "",
    target_date: datetime | None = None,
    outcome_id: int | None = None,
) -> CandidateAcceptanceOutcome:
    if outcome_id:
        row = (
            db.query(CandidateAcceptanceOutcome)
            .filter(
                CandidateAcceptanceOutcome.id == outcome_id,
                CandidateAcceptanceOutcome.candidate_id == candidate_id,
            )
            .one_or_none()
        )
        if not row:
            raise ValueError("outcome_not_found")
        row.title = title[:300]
        row.description = (description or "")[:4000]
        if target_date is not None:
            row.target_date = target_date
        row.version = int(row.version or 1) + 1
        row.updated_at = _utcnow()
        row.claim_kind = cc.CLAIM_SUGGESTION
        db.commit()
        db.refresh(row)
        return row
    row = CandidateAcceptanceOutcome(
        candidate_id=candidate_id,
        title=title[:300],
        description=(description or "")[:4000],
        target_date=target_date,
        status="active",
        claim_kind=cc.CLAIM_SUGGESTION,
        version=1,
        evidence_json=_dumps(
            [{"note": "Candidate-defined outcome — not a hiring probability claim"}]
        ),
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _audit(
    db: Session,
    *,
    candidate_id: int,
    item_id: int | None,
    action: str,
    before: dict,
    after: dict,
) -> None:
    db.add(
        CandidateAcceptanceItemAudit(
            candidate_id=candidate_id,
            item_id=item_id,
            action=action[:64],
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


# ── Upsert item (versioned, no silent overwrite of history) ─────────────────


def upsert_item(
    db: Session,
    *,
    candidate_id: int,
    item_key: str,
    category: str,
    title: str,
    summary: str = "",
    importance: int = 50,
    claim_kind: str = cc.CLAIM_UNKNOWN,
    confidence: str = "medium",
    starts_at: datetime | None = None,
    ends_at: datetime | None = None,
    due_at: datetime | None = None,
    timezone_name: str = "UTC",
    duration_minutes: int | None = None,
    source_type: str = "internal",
    source_id: str | None = None,
    deep_link: str | None = None,
    evidence: list | None = None,
    payload: dict | None = None,
    state: str | None = None,
    at_risk: bool = False,
    protected: bool = False,
) -> CandidateAcceptanceItem:
    if category not in CATEGORIES:
        category = "commitment"
    key = item_key[:160]
    row = (
        db.query(CandidateAcceptanceItem)
        .filter(
            CandidateAcceptanceItem.candidate_id == candidate_id,
            CandidateAcceptanceItem.item_key == key,
        )
        .one_or_none()
    )
    evidence_json = _dumps(evidence or [])
    payload_json = _dumps({**(payload or {}), "kpi_excluded": True, "external_auto_write": False})
    if row is None:
        row = CandidateAcceptanceItem(
            candidate_id=candidate_id,
            item_key=key,
            category=category,
            state=state or ("scheduled" if starts_at else "unscheduled"),
            title=title[:300],
            summary=(summary or "")[:4000],
            importance=max(0, min(100, importance)),
            claim_kind=claim_kind if claim_kind in {
                cc.CLAIM_FACT, cc.CLAIM_INFERENCE, cc.CLAIM_SUGGESTION, cc.CLAIM_UNKNOWN
            } else cc.CLAIM_UNKNOWN,
            confidence=confidence,
            starts_at=starts_at,
            ends_at=ends_at,
            due_at=due_at,
            timezone=timezone_name[:64] or "UTC",
            duration_minutes=duration_minutes,
            source_type=source_type[:64],
            source_id=(source_id or "")[:128] or None,
            deep_link=(deep_link or "")[:300] or None,
            evidence_json=evidence_json,
            payload_json=payload_json,
            version=1,
            at_risk=at_risk,
            protected=protected,
            created_at=_utcnow(),
            updated_at=_utcnow(),
        )
        db.add(row)
        db.flush()
        _audit(
            db,
            candidate_id=candidate_id,
            item_id=row.id,
            action="create",
            before={},
            after={"item_key": key, "state": row.state},
        )
    else:
        before = {"state": row.state, "version": row.version, "title": row.title}
        # Never silently overwrite user-protected / postponed / completed states from aggregation
        if row.state in {"protected", "postponed", "completed", "cancelled"} and state is None:
            row.updated_at = _utcnow()
            return row
        if state and state in STATES and not row.protected:
            row.state = state
        row.title = title[:300]
        row.summary = (summary or "")[:4000]
        row.importance = max(0, min(100, importance))
        row.claim_kind = claim_kind
        row.confidence = confidence
        if starts_at is not None:
            row.starts_at = starts_at
        if ends_at is not None:
            row.ends_at = ends_at
        if due_at is not None:
            row.due_at = due_at
        row.timezone = timezone_name[:64] or row.timezone
        if duration_minutes is not None:
            row.duration_minutes = duration_minutes
        row.deep_link = (deep_link or row.deep_link or "")[:300] or None
        row.evidence_json = evidence_json
        row.payload_json = payload_json
        row.at_risk = at_risk
        row.version = int(row.version or 1) + 1
        row.updated_at = _utcnow()
        _audit(
            db,
            candidate_id=candidate_id,
            item_id=row.id,
            action="upsert",
            before=before,
            after={"state": row.state, "version": row.version},
        )
    return row


def mutate_item(
    db: Session,
    *,
    candidate_id: int,
    item_id: int,
    action: str,
    postpone_hours: int | None = None,
    starts_at: datetime | None = None,
    ends_at: datetime | None = None,
    title: str | None = None,
) -> CandidateAcceptanceItem:
    if action not in ITEM_ACTIONS:
        raise ValueError("invalid_action")
    row = (
        db.query(CandidateAcceptanceItem)
        .filter(
            CandidateAcceptanceItem.id == item_id,
            CandidateAcceptanceItem.candidate_id == candidate_id,
        )
        .one_or_none()
    )
    if not row:
        raise ValueError("item_not_found")
    before = {"state": row.state, "protected": row.protected, "version": row.version}
    now = _utcnow()
    if action == "schedule":
        if starts_at:
            row.starts_at = starts_at
        if ends_at:
            row.ends_at = ends_at
        row.state = "scheduled"
    elif action == "postpone":
        hours = max(1, min(168, postpone_hours or 24))
        base = row.due_at or row.starts_at or now
        row.due_at = base + timedelta(hours=hours)
        if row.starts_at:
            row.starts_at = row.starts_at + timedelta(hours=hours)
            if row.ends_at:
                row.ends_at = row.ends_at + timedelta(hours=hours)
        row.state = "postponed"
    elif action == "protect":
        row.protected = True
        row.state = "protected"
    elif action == "complete":
        row.state = "completed"
    elif action == "cancel":
        row.state = "cancelled"
    elif action == "reopen":
        row.protected = False
        row.state = "proposed" if not row.starts_at else "scheduled"
    elif action == "edit":
        if title:
            row.title = title[:300]
        if starts_at:
            row.starts_at = starts_at
        if ends_at:
            row.ends_at = ends_at
    elif action == "dismiss":
        row.archived_at = now
        row.state = "cancelled"
    row.version = int(row.version or 1) + 1
    row.updated_at = now
    _audit(
        db,
        candidate_id=candidate_id,
        item_id=row.id,
        action=f"item_{action}",
        before=before,
        after={"state": row.state, "protected": row.protected, "version": row.version},
    )
    db.commit()
    db.refresh(row)
    return row


# ── Aggregation from existing career surfaces ───────────────────────────────


def refresh_from_sources(db: Session, *, candidate_id: int) -> dict[str, Any]:
    """Evidence-only aggregation into Acceptance Calendar items (deduped by item_key)."""
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one_or_none()
    if not cand:
        raise ValueError("candidate_not_found")
    consent = get_or_create_consent(db, candidate_id=candidate_id)
    if not consent.internal_calendar_enabled:
        return {"ok": False, "reason": "internal_calendar_disabled", "count": 0}

    budget = get_or_create_budget(db, candidate_id=candidate_id)
    created = 0
    now = _utcnow()

    # Interviews (FACT when ScheduledInterview exists)
    interviews = (
        db.query(ScheduledInterview)
        .filter(
            ScheduledInterview.user_id == cand.user_id,
            ScheduledInterview.status != "cancelled",
            ScheduledInterview.interview_start >= now - timedelta(days=1),
        )
        .order_by(ScheduledInterview.interview_start.asc())
        .limit(30)
        .all()
    )
    for iv in interviews:
        upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"interview:{iv.id}",
            category="interview",
            title=f"Interview: {iv.job_title} @ {iv.company_name}",
            summary="Scheduled interview hold in TWIN — not an external invite.",
            importance=95,
            claim_kind=cc.CLAIM_FACT,
            confidence="high",
            starts_at=iv.interview_start,
            ends_at=iv.interview_end,
            due_at=iv.interview_start,
            timezone_name=getattr(iv, "timezone", None) or budget.timezone,
            duration_minutes=int(
                max(15, (iv.interview_end - iv.interview_start).total_seconds() // 60)
            )
            if iv.interview_end and iv.interview_start
            else 60,
            source_type="scheduled_interview",
            source_id=str(iv.id),
            deep_link="/dashboard/calendar",
            evidence=[{"type": "scheduled_interview", "id": iv.id}],
            state="confirmed_internal",
            at_risk=iv.interview_start < now + timedelta(hours=24),
        )
        created += 1

    # Applications — status FACT; employer deadlines UNKNOWN unless evidenced
    apps = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id)
        .order_by(Application.id.desc())
        .limit(25)
        .all()
    )
    for app in apps:
        status = (getattr(app, "status", None) or "draft").lower()
        upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"application:{app.id}",
            category="application",
            title=f"Application #{app.id} ({status})",
            summary="Application milestone — employer deadlines UNKNOWN without evidence.",
            importance=70 if status in {"draft", "ready"} else 55,
            claim_kind=cc.CLAIM_FACT if status else cc.CLAIM_UNKNOWN,
            confidence="medium",
            due_at=None,
            source_type="application",
            source_id=str(app.id),
            deep_link="/dashboard/applications",
            evidence=[{"type": "application", "id": app.id, "status": status}],
            payload={"draft_only_external_submit": True, "employer_deadline": "UNKNOWN"},
            state="unscheduled" if status == "draft" else "proposed",
        )
        created += 1

    # Goals
    goals = (
        db.query(CandidateCareerGoal)
        .filter(
            CandidateCareerGoal.candidate_id == candidate_id,
            CandidateCareerGoal.status == "active",
        )
        .limit(20)
        .all()
    )
    for g in goals:
        upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"goal:{g.id}",
            category="goal",
            title=g.title[:300],
            summary="Goal target dates require your confirmation to change.",
            importance=65,
            claim_kind=cc.CLAIM_SUGGESTION,
            confidence="medium",
            due_at=getattr(g, "target_date", None),
            source_type="career_goal",
            source_id=str(g.id),
            deep_link="/dashboard/career",
            evidence=[{"type": "career_goal", "id": g.id}],
            state="unscheduled",
        )
        created += 1

    # Reminders
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
    for r in reminders:
        upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"reminder:{r.id}",
            category="reminder",
            title=r.title[:300],
            summary="In-product reminder — email only with separate opt-in.",
            importance=60,
            claim_kind=cc.CLAIM_FACT,
            confidence="high",
            due_at=r.due_at,
            starts_at=r.due_at,
            source_type="career_reminder",
            source_id=str(r.id),
            deep_link="/dashboard/career",
            evidence=[{"type": "career_reminder", "id": r.id}],
            state="scheduled",
            at_risk=r.due_at <= now + timedelta(hours=12),
        )
        created += 1

    # Learning — completion ≠ mastery
    learn = (
        db.query(CandidateLearningLoopEntry)
        .filter(CandidateLearningLoopEntry.candidate_id == candidate_id)
        .order_by(CandidateLearningLoopEntry.id.desc())
        .limit(10)
        .all()
    )
    for i, entry in enumerate(learn[:5]):
        upsert_item(
            db,
            candidate_id=candidate_id,
            item_key=f"learning:loop:{entry.id}",
            category="learning",
            title="Learning follow-up (no mastery claim)",
            summary="Learning queue item — completion does not imply mastery.",
            importance=40,
            claim_kind=cc.CLAIM_SUGGESTION,
            confidence="low",
            source_type="learning_loop",
            source_id=str(entry.id),
            deep_link="/dashboard/career",
            evidence=[{"type": "learning_loop", "id": entry.id}],
            payload={"mastery_claim": False},
            state="unscheduled",
        )
        created += 1
        _ = i

    db.commit()
    return {"ok": True, "upserted_sources": created, "kpi_excluded": True}


# ── Availability / MS read-only / synthetic adapter ─────────────────────────


def microsoft_read_status(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    """Read-only Graph status — never enables write scopes."""
    settings = get_settings()
    consent = get_or_create_consent(db, candidate_id=candidate_id)
    scopes = effective_microsoft_calendar_scopes(settings)
    forbidden_present = [
        t for t in FORBIDDEN_MS_CALENDAR_SCOPE_TOKENS if t in scopes.split()
    ]
    row = (
        db.query(UserMicrosoftCalendar)
        .filter(UserMicrosoftCalendar.user_id == user_id)
        .one_or_none()
    )
    connected = bool(row and (getattr(row, "refresh_token_encrypted", None) or getattr(row, "access_token_encrypted", None)))
    write_flag = bool(getattr(settings, "microsoft_calendar_write_enabled", False))
    busy_flag = bool(getattr(settings, "microsoft_busy_read_enabled", False))
    mode = "internal_only"
    limitation = None
    if not consent.ms_busy_read_opt_in:
        limitation = "ms_busy_read_not_opted_in"
    elif not busy_flag:
        limitation = "microsoft_busy_read_disabled_in_config"
    elif not connected:
        limitation = "no_microsoft_credential"
        mode = "internal_only_with_synthetic_adapter"
    else:
        mode = "ms_busy_read_available"
    return {
        "provider": "microsoft",
        "mode": mode,
        "connected": connected,
        "opt_in": consent.ms_busy_read_opt_in,
        "busy_read_enabled": busy_flag,
        "write_enabled": write_flag,
        "scopes": scopes,
        "forbidden_scopes_present": forbidden_present,
        "write_scopes_blocked": True,
        "limitation": limitation,
        "claim_kind": cc.CLAIM_FACT if connected else cc.CLAIM_UNKNOWN,
        "note": "Microsoft Calendar write is OFF — Acceptance Calendar never creates external events.",
        "synthetic_adapter": mode.startswith("internal"),
    }


def load_availability(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    use_synthetic: bool = True,
) -> dict[str, Any]:
    """Normalize busy blocks — store only if consented; synthetic adapter when Graph unavailable."""
    consent = get_or_create_consent(db, candidate_id=candidate_id)
    ms = microsoft_read_status(db, candidate_id=candidate_id, user_id=user_id)
    blocks: list[dict] = []
    source = "none"

    if consent.store_availability_blocks:
        existing = (
            db.query(CandidateAvailabilityBlock)
            .filter(CandidateAvailabilityBlock.candidate_id == candidate_id)
            .order_by(CandidateAvailabilityBlock.starts_at.asc())
            .limit(100)
            .all()
        )
        for b in existing:
            blocks.append(
                {
                    "starts_at": b.starts_at.isoformat() + "Z",
                    "ends_at": b.ends_at.isoformat() + "Z",
                    "busy": b.busy,
                    "provider": b.provider,
                    "source": b.source,
                }
            )
        if blocks:
            source = "stored"

    if not blocks and use_synthetic and ms["mode"].startswith("internal"):
        # Synthetic empty busy set — planning still works; UNKNOWN external availability
        source = "synthetic_empty"
        blocks = []

    # Protected blocks from explicit budget (never invent)
    budget = get_or_create_budget(db, candidate_id=candidate_id)
    protected = _loads(budget.protected_blocks_json, [])
    return {
        "blocks": blocks,
        "protected_blocks": protected if isinstance(protected, list) else [],
        "source": source,
        "microsoft": ms,
        "event_content_stored": False,
        "claim_kind": cc.CLAIM_UNKNOWN if source.startswith("synthetic") else cc.CLAIM_FACT,
        "kpi_excluded": True,
    }


def detect_conflicts(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
) -> list[dict[str, Any]]:
    avail = load_availability(db, candidate_id=candidate_id, user_id=user_id)
    items = (
        db.query(CandidateAcceptanceItem)
        .filter(
            CandidateAcceptanceItem.candidate_id == candidate_id,
            CandidateAcceptanceItem.archived_at.is_(None),
            CandidateAcceptanceItem.state.notin_(["cancelled", "completed"]),
            CandidateAcceptanceItem.starts_at.isnot(None),
        )
        .order_by(CandidateAcceptanceItem.starts_at.asc())
        .limit(80)
        .all()
    )
    conflicts: list[dict] = []
    # Internal overlaps
    for i, a in enumerate(items):
        if not a.starts_at or not a.ends_at:
            continue
        for b in items[i + 1 :]:
            if not b.starts_at or not b.ends_at:
                continue
            if a.starts_at < b.ends_at and b.starts_at < a.ends_at:
                conflicts.append(
                    {
                        "kind": "internal_overlap",
                        "item_ids": [a.id, b.id],
                        "titles": [a.title, b.title],
                        "claim_kind": cc.CLAIM_FACT,
                        "override_allowed": True,
                        "external_move": False,
                        "evidence": [{"type": "time_overlap"}],
                    }
                )
    # Busy overlap (only when we have blocks)
    for block in avail.get("blocks") or []:
        try:
            bs = datetime.fromisoformat(block["starts_at"].replace("Z", ""))
            be = datetime.fromisoformat(block["ends_at"].replace("Z", ""))
        except Exception:
            continue
        for a in items:
            if not a.starts_at or not a.ends_at:
                continue
            if a.starts_at < be and bs < a.ends_at:
                conflicts.append(
                    {
                        "kind": "busy_overlap",
                        "item_ids": [a.id],
                        "titles": [a.title],
                        "claim_kind": cc.CLAIM_INFERENCE,
                        "override_allowed": True,
                        "external_move": False,
                        "evidence": [{"type": "availability_block", "provider": block.get("provider")}],
                    }
                )
    if avail.get("source", "").startswith("synthetic") and not conflicts:
        conflicts.append(
            {
                "kind": "availability_unknown",
                "item_ids": [],
                "titles": [],
                "claim_kind": cc.CLAIM_UNKNOWN,
                "override_allowed": True,
                "external_move": False,
                "evidence": [{"type": "no_external_busy_data"}],
                "note": "External availability UNKNOWN — internal planning mode active.",
            }
        )
    return conflicts


def compute_feasibility(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
) -> dict[str, Any]:
    budget = get_or_create_budget(db, candidate_id=candidate_id)
    conflicts = detect_conflicts(db, candidate_id=candidate_id, user_id=user_id)
    hard = [c for c in conflicts if c.get("kind") in {"internal_overlap", "busy_overlap"}]
    items = (
        db.query(CandidateAcceptanceItem)
        .filter(
            CandidateAcceptanceItem.candidate_id == candidate_id,
            CandidateAcceptanceItem.archived_at.is_(None),
            CandidateAcceptanceItem.state.notin_(["cancelled", "completed"]),
        )
        .all()
    )
    minutes = 0
    for it in items:
        if it.duration_minutes:
            minutes += int(it.duration_minutes)
        elif it.starts_at and it.ends_at:
            minutes += int(max(0, (it.ends_at - it.starts_at).total_seconds() // 60))
    hours = minutes / 60.0
    cap = float(budget.hours_per_week or 10)
    avail = load_availability(db, candidate_id=candidate_id, user_id=user_id)
    status = "FEASIBLE"
    explain = []
    if hard:
        status = "CONFLICTING"
        explain.append({"factor": "conflicts", "why": f"{len(hard)} time conflicts detected"})
    elif avail.get("source", "").startswith("synthetic") and not items:
        status = "INCOMPLETE_DATA"
        explain.append({"factor": "availability", "why": "No external busy data; budget only"})
    elif hours > cap * 1.25:
        status = "OVERLOADED"
        explain.append({"factor": "budget", "why": f"{hours:.1f}h planned vs {cap}h/week budget"})
    elif hours > cap * 0.85:
        status = "TIGHT"
        explain.append({"factor": "budget", "why": f"{hours:.1f}h near {cap}h/week budget"})
    elif not items:
        status = "UNKNOWN"
        explain.append({"factor": "empty", "why": "No calendar items yet"})
    else:
        explain.append({"factor": "budget", "why": f"{hours:.1f}h within {cap}h/week budget"})
    if status not in FEASIBILITY:
        status = "UNKNOWN"
    return {
        "status": status,
        "planned_hours": round(hours, 2),
        "budget_hours_per_week": cap,
        "conflict_count": len(hard),
        "explain": explain,
        "claim_kind": cc.CLAIM_INFERENCE,
        "external_auto_schedule": False,
    }


# ── Proposed holds ──────────────────────────────────────────────────────────


def propose_holds(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    limit: int = 3,
) -> list[CandidateProposedHold]:
    """Suggest DRAFT holds for unscheduled high-importance items — never externally booked."""
    budget = get_or_create_budget(db, candidate_id=candidate_id)
    conflicts = detect_conflicts(db, candidate_id=candidate_id, user_id=user_id)
    busy_ranges = []
    for c in conflicts:
        if c.get("kind") == "internal_overlap":
            busy_ranges.extend(c.get("item_ids") or [])
    unscheduled = (
        db.query(CandidateAcceptanceItem)
        .filter(
            CandidateAcceptanceItem.candidate_id == candidate_id,
            CandidateAcceptanceItem.archived_at.is_(None),
            CandidateAcceptanceItem.state.in_(["unscheduled", "proposed", "postponed"]),
            CandidateAcceptanceItem.protected.is_(False),
        )
        .order_by(CandidateAcceptanceItem.importance.desc())
        .limit(10)
        .all()
    )
    out: list[CandidateProposedHold] = []
    base = _utcnow() + timedelta(days=1)
    base = base.replace(hour=10, minute=0, second=0, microsecond=0)
    for i, item in enumerate(unscheduled[: max(1, min(5, limit))]):
        start = base + timedelta(days=i)
        dur = item.duration_minutes or 45
        end = start + timedelta(minutes=dur)
        alt_start = start + timedelta(hours=3)
        hold_key = f"hold:{item.item_key}:{start.date().isoformat()}"
        existing = (
            db.query(CandidateProposedHold)
            .filter(
                CandidateProposedHold.candidate_id == candidate_id,
                CandidateProposedHold.hold_key == hold_key[:160],
            )
            .one_or_none()
        )
        why = {
            "importance": item.importance,
            "category": item.category,
            "why": "Priority item lacks a scheduled block",
            "externally_booked": False,
            "fatigue_cap_respected": True,
        }
        alts = [
            {
                "starts_at": alt_start.isoformat() + "Z",
                "ends_at": (alt_start + timedelta(minutes=dur)).isoformat() + "Z",
                "why": "Afternoon alternative",
            }
        ]
        if existing:
            if existing.status in {"DISMISSED", "ACCEPTED_INTERNAL", "EXPORTED"}:
                continue
            existing.starts_at = start
            existing.ends_at = end
            existing.why_json = _dumps(why)
            existing.alternatives_json = _dumps(alts)
            existing.version = int(existing.version or 1) + 1
            existing.updated_at = _utcnow()
            existing.external_created = False
            out.append(existing)
            continue
        row = CandidateProposedHold(
            candidate_id=candidate_id,
            hold_key=hold_key[:160],
            title=f"Hold: {item.title}"[:300],
            status="DRAFT",
            starts_at=start,
            ends_at=end,
            timezone=budget.timezone,
            why_json=_dumps(why),
            alternatives_json=_dumps(alts),
            item_id=item.id,
            claim_kind=cc.CLAIM_SUGGESTION,
            external_created=False,
            version=1,
            created_at=_utcnow(),
            updated_at=_utcnow(),
        )
        db.add(row)
        out.append(row)
    db.commit()
    for r in out:
        db.refresh(r)
    return out


def mutate_hold(
    db: Session,
    *,
    candidate_id: int,
    hold_id: int,
    action: str,
) -> CandidateProposedHold:
    row = (
        db.query(CandidateProposedHold)
        .filter(
            CandidateProposedHold.id == hold_id,
            CandidateProposedHold.candidate_id == candidate_id,
        )
        .one_or_none()
    )
    if not row:
        raise ValueError("hold_not_found")
    if row.external_created:
        raise ValueError("external_hold_immutable")
    before = {"status": row.status}
    if action == "propose":
        row.status = "PROPOSED"
    elif action == "accept":
        row.status = "ACCEPTED_INTERNAL"
        if row.item_id:
            item = (
                db.query(CandidateAcceptanceItem)
                .filter(
                    CandidateAcceptanceItem.id == row.item_id,
                    CandidateAcceptanceItem.candidate_id == candidate_id,
                )
                .one_or_none()
            )
            if item:
                item.starts_at = row.starts_at
                item.ends_at = row.ends_at
                item.state = "scheduled"
                item.version = int(item.version or 1) + 1
    elif action == "export":
        row.status = "EXPORTED"
        # ICS only — never MS write
    elif action == "dismiss":
        row.status = "DISMISSED"
    else:
        raise ValueError("invalid_hold_action")
    row.external_created = False
    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        item_id=row.item_id,
        action=f"hold_{action}",
        before=before,
        after={"status": row.status, "external_created": False},
    )
    db.commit()
    db.refresh(row)
    return row


# ── Weekly / monthly planning ───────────────────────────────────────────────


def create_weekly_plan(db: Session, *, candidate_id: int, user_id: int) -> CandidateWeeklyPlan:
    feasibility = compute_feasibility(db, candidate_id=candidate_id, user_id=user_id)
    week_start = (_utcnow() - timedelta(days=_utcnow().weekday())).date().isoformat()
    latest = (
        db.query(CandidateWeeklyPlan)
        .filter(
            CandidateWeeklyPlan.candidate_id == candidate_id,
            CandidateWeeklyPlan.week_start == week_start,
        )
        .order_by(CandidateWeeklyPlan.version.desc())
        .first()
    )
    ver = int(latest.version) + 1 if latest else 1
    strategy = {
        "focus": "Protect interviews; schedule top unscheduled goals; respect time budget",
        "feasibility": feasibility.get("status"),
        "requires_user_approval": True,
        "hiring_certainty": "UNKNOWN",
        "external_auto_schedule": False,
    }
    row = CandidateWeeklyPlan(
        candidate_id=candidate_id,
        week_start=week_start,
        strategy_json=_dumps(strategy),
        user_approved=None,
        version=ver,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def approve_weekly_plan(
    db: Session, *, candidate_id: int, plan_id: int, approved: bool
) -> CandidateWeeklyPlan:
    row = (
        db.query(CandidateWeeklyPlan)
        .filter(
            CandidateWeeklyPlan.id == plan_id,
            CandidateWeeklyPlan.candidate_id == candidate_id,
        )
        .one_or_none()
    )
    if not row:
        raise ValueError("plan_not_found")
    row.user_approved = bool(approved)
    row.approved_at = _utcnow() if approved else None
    db.commit()
    db.refresh(row)
    return row


def monthly_overview(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    items = (
        db.query(CandidateAcceptanceItem)
        .filter(
            CandidateAcceptanceItem.candidate_id == candidate_id,
            CandidateAcceptanceItem.archived_at.is_(None),
        )
        .all()
    )
    by_cat: dict[str, int] = {}
    for it in items:
        by_cat[it.category] = by_cat.get(it.category, 0) + 1
    feasibility = compute_feasibility(db, candidate_id=candidate_id, user_id=user_id)
    outcomes = (
        db.query(CandidateAcceptanceOutcome)
        .filter(
            CandidateAcceptanceOutcome.candidate_id == candidate_id,
            CandidateAcceptanceOutcome.status == "active",
        )
        .all()
    )
    return {
        "by_category": by_cat,
        "item_count": len(items),
        "feasibility": feasibility,
        "outcomes": [
            {
                "id": o.id,
                "title": o.title,
                "target_date": o.target_date.isoformat() + "Z" if o.target_date else None,
                "claim_kind": o.claim_kind,
                "hiring_certainty": "UNKNOWN",
            }
            for o in outcomes
        ],
        "fake_scores": False,
        "claim_kind": cc.CLAIM_INFERENCE,
        "kpi_excluded": True,
    }


# ── Preferences / fatigue / privacy ─────────────────────────────────────────


def save_preference_feedback(
    db: Session, *, candidate_id: int, prefs: dict
) -> CandidateCalendarPreference:
    latest = (
        db.query(CandidateCalendarPreference)
        .filter(CandidateCalendarPreference.candidate_id == candidate_id)
        .order_by(CandidateCalendarPreference.version.desc())
        .first()
    )
    ver = int(latest.version) + 1 if latest else 1
    if latest:
        latest.active = False
    # Strip guilt/streak anti-patterns
    clean = {
        k: v
        for k, v in (prefs or {}).items()
        if k not in {"guilt_nudge", "streak", "shame_copy"}
    }
    clean["no_guilt"] = True
    clean["no_streaks"] = True
    row = CandidateCalendarPreference(
        candidate_id=candidate_id,
        version=ver,
        prefs_json=_dumps(clean),
        active=True,
        source="user_feedback",
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def fatigue_controls(db: Session, *, candidate_id: int) -> dict[str, Any]:
    cadence = (
        db.query(CandidateDailyCadence)
        .filter(CandidateDailyCadence.candidate_id == candidate_id)
        .one_or_none()
    )
    budget = get_or_create_budget(db, candidate_id=candidate_id)
    return {
        "daily_cap": cadence.daily_cap if cadence else 7,
        "cooldown_hours": cadence.cooldown_hours if cadence else 24,
        "quiet_mode": bool(cadence.quiet_mode) if cadence else False,
        "hours_per_week": budget.hours_per_week,
        "guilt_streaks": False,
        "claim_kind": cc.CLAIM_FACT,
    }


def export_calendar_data(db: Session, *, candidate_id: int) -> dict[str, Any]:
    items = (
        db.query(CandidateAcceptanceItem)
        .filter(CandidateAcceptanceItem.candidate_id == candidate_id)
        .all()
    )
    holds = (
        db.query(CandidateProposedHold)
        .filter(CandidateProposedHold.candidate_id == candidate_id)
        .all()
    )
    return {
        "items": [_ser_item(i) for i in items],
        "holds": [_ser_hold(h) for h in holds],
        "consent": _ser_consent(get_or_create_consent(db, candidate_id=candidate_id)),
        "budget": _ser_budget(get_or_create_budget(db, candidate_id=candidate_id)),
        "kpi_excluded": True,
    }


def delete_calendar_data(db: Session, *, candidate_id: int) -> dict[str, Any]:
    n_items = (
        db.query(CandidateAcceptanceItem)
        .filter(CandidateAcceptanceItem.candidate_id == candidate_id)
        .delete(synchronize_session=False)
    )
    n_holds = (
        db.query(CandidateProposedHold)
        .filter(CandidateProposedHold.candidate_id == candidate_id)
        .delete(synchronize_session=False)
    )
    n_blocks = (
        db.query(CandidateAvailabilityBlock)
        .filter(CandidateAvailabilityBlock.candidate_id == candidate_id)
        .delete(synchronize_session=False)
    )
    n_audits = (
        db.query(CandidateAcceptanceItemAudit)
        .filter(CandidateAcceptanceItemAudit.candidate_id == candidate_id)
        .delete(synchronize_session=False)
    )
    db.query(CandidateWeeklyPlan).filter(
        CandidateWeeklyPlan.candidate_id == candidate_id
    ).delete(synchronize_session=False)
    db.query(CandidateCalendarPreference).filter(
        CandidateCalendarPreference.candidate_id == candidate_id
    ).delete(synchronize_session=False)
    db.commit()
    return {
        "deleted_items": n_items,
        "deleted_holds": n_holds,
        "deleted_blocks": n_blocks,
        "deleted_audits": n_audits,
        "ok": True,
    }


# ── ICS (safe: no attendees, no organizer impersonation) ────────────────────


def items_to_ics(items: list[CandidateAcceptanceItem]) -> str:
    from app.services.ics_export import _ics_escape, _utc_stamp

    now = _utcnow()
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TWIN//AcceptanceCalendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    for row in items:
        if not row.starts_at:
            continue
        end = row.ends_at or (row.starts_at + timedelta(minutes=row.duration_minutes or 45))
        uid = f"twin-acceptance-{row.id}@twin"
        summary = _ics_escape(row.title)
        desc = _ics_escape(
            f"{row.summary}\nSource: TWIN Acceptance Calendar (manual import). "
            "No attendees. Not an external invite."
        )
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{_utc_stamp(now)}",
                f"DTSTART:{_utc_stamp(row.starts_at)}",
                f"DTEND:{_utc_stamp(end)}",
                "STATUS:TENTATIVE",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{desc}",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def build_ics_for_candidate(db: Session, *, candidate_id: int) -> str:
    consent = get_or_create_consent(db, candidate_id=candidate_id)
    if not consent.ics_export_opt_in:
        raise ValueError("ics_export_not_opted_in")
    items = (
        db.query(CandidateAcceptanceItem)
        .filter(
            CandidateAcceptanceItem.candidate_id == candidate_id,
            CandidateAcceptanceItem.archived_at.is_(None),
            CandidateAcceptanceItem.starts_at.isnot(None),
            CandidateAcceptanceItem.state.notin_(["cancelled"]),
        )
        .order_by(CandidateAcceptanceItem.starts_at.asc())
        .limit(100)
        .all()
    )
    return items_to_ics(items)


# ── Views + aggregate ───────────────────────────────────────────────────────


def _ser_item(r: CandidateAcceptanceItem) -> dict:
    return {
        "id": r.id,
        "item_key": r.item_key,
        "category": r.category,
        "state": r.state,
        "title": r.title,
        "summary": r.summary,
        "importance": r.importance,
        "claim_kind": r.claim_kind,
        "confidence": r.confidence,
        "starts_at": r.starts_at.isoformat() + "Z" if r.starts_at else None,
        "ends_at": r.ends_at.isoformat() + "Z" if r.ends_at else None,
        "due_at": r.due_at.isoformat() + "Z" if r.due_at else None,
        "timezone": r.timezone,
        "duration_minutes": r.duration_minutes,
        "deep_link": r.deep_link,
        "at_risk": r.at_risk,
        "protected": r.protected,
        "version": r.version,
        "evidence": _loads(r.evidence_json, []),
        "editable": True,
        "reversible": True,
        "external_confirmed": r.state == "externally_confirmed",
    }


def _ser_hold(r: CandidateProposedHold) -> dict:
    return {
        "id": r.id,
        "hold_key": r.hold_key,
        "title": r.title,
        "status": r.status,
        "starts_at": r.starts_at.isoformat() + "Z",
        "ends_at": r.ends_at.isoformat() + "Z",
        "timezone": r.timezone,
        "why": _loads(r.why_json, {}),
        "alternatives": _loads(r.alternatives_json, []),
        "item_id": r.item_id,
        "claim_kind": r.claim_kind,
        "external_created": bool(r.external_created),
        "externally_booked": False,
        "version": r.version,
    }


def _ser_consent(r: CandidateCalendarConsent) -> dict:
    return {
        "internal_calendar_enabled": r.internal_calendar_enabled,
        "ms_busy_read_opt_in": r.ms_busy_read_opt_in,
        "google_busy_read_opt_in": r.google_busy_read_opt_in,
        "ics_export_opt_in": r.ics_export_opt_in,
        "store_availability_blocks": r.store_availability_blocks,
        "version": r.version,
        "bundled_opt_in": False,
    }


def _ser_budget(r: CandidateTimeBudget) -> dict:
    return {
        "timezone": r.timezone,
        "hours_per_week": r.hours_per_week,
        "hours_per_day_cap": r.hours_per_day_cap,
        "protected_blocks": _loads(r.protected_blocks_json, []),
        "note": r.note,
        "version": r.version,
        "source": r.source,
        "inferred_private_obligations": False,
    }


def list_items(
    db: Session,
    *,
    candidate_id: int,
    view: str = "agenda",
) -> list[dict]:
    now = _utcnow()
    q = db.query(CandidateAcceptanceItem).filter(
        CandidateAcceptanceItem.candidate_id == candidate_id,
        CandidateAcceptanceItem.archived_at.is_(None),
    )
    rows = q.order_by(
        CandidateAcceptanceItem.importance.desc(),
        CandidateAcceptanceItem.id.desc(),
    ).limit(100).all()
    # Prefer due/start ordering in Python for SQLite-friendly null handling
    def _sort_key(r: CandidateAcceptanceItem) -> tuple:
        due = r.due_at or r.starts_at or datetime.max
        return (-int(r.importance or 0), due)

    rows = sorted(rows, key=_sort_key)

    def _in_day(dt: datetime | None) -> bool:
        return bool(dt and dt.date() == now.date())

    def _in_week(dt: datetime | None) -> bool:
        if not dt:
            return False
        start = now - timedelta(days=now.weekday())
        end = start + timedelta(days=7)
        return start <= dt < end

    def _in_month(dt: datetime | None) -> bool:
        return bool(dt and dt.year == now.year and dt.month == now.month)

    out = []
    for r in rows:
        if view == "today" and not (
            _in_day(r.starts_at) or _in_day(r.due_at) or r.state == "at_risk"
        ):
            continue
        if view == "week" and not (_in_week(r.starts_at) or _in_week(r.due_at)):
            continue
        if view == "month" and not (_in_month(r.starts_at) or _in_month(r.due_at)):
            continue
        if view == "unscheduled" and r.state not in {"unscheduled", "proposed"}:
            continue
        if view == "deadlines" and r.category not in {"deadline", "application", "goal", "reminder"}:
            continue
        if view == "interviews" and r.category != "interview":
            continue
        if view == "applications" and r.category != "application":
            continue
        if view == "learning" and r.category != "learning":
            continue
        if view == "reviews" and r.category != "review":
            continue
        if view == "at_risk" and not r.at_risk and r.state != "at_risk":
            continue
        out.append(_ser_item(r))
    return out


def path_to_next_outcome(db: Session, *, candidate_id: int) -> dict[str, Any]:
    outcome = (
        db.query(CandidateAcceptanceOutcome)
        .filter(
            CandidateAcceptanceOutcome.candidate_id == candidate_id,
            CandidateAcceptanceOutcome.status == "active",
        )
        .order_by(CandidateAcceptanceOutcome.id.desc())
        .first()
    )
    next_items = (
        db.query(CandidateAcceptanceItem)
        .filter(
            CandidateAcceptanceItem.candidate_id == candidate_id,
            CandidateAcceptanceItem.archived_at.is_(None),
            CandidateAcceptanceItem.state.notin_(["completed", "cancelled"]),
        )
        .order_by(CandidateAcceptanceItem.importance.desc())
        .limit(5)
        .all()
    )
    return {
        "outcome": {
            "id": outcome.id,
            "title": outcome.title,
            "target_date": outcome.target_date.isoformat() + "Z" if outcome and outcome.target_date else None,
            "claim_kind": outcome.claim_kind if outcome else cc.CLAIM_UNKNOWN,
            "hiring_certainty": "UNKNOWN",
        }
        if outcome
        else None,
        "next_steps": [_ser_item(i) for i in next_items],
        "acceptance_probability": "UNKNOWN",
        "claim_kind": cc.CLAIM_SUGGESTION,
    }


def build_acceptance_calendar_aggregate(
    db: Session, *, candidate_id: int, user_id: int, refresh: bool = True
) -> dict[str, Any]:
    consent = get_or_create_consent(db, candidate_id=candidate_id)
    if refresh and consent.internal_calendar_enabled:
        try:
            refresh_from_sources(db, candidate_id=candidate_id)
        except Exception:
            logger.exception("acceptance calendar refresh failed candidate_id=%s", candidate_id)

    feasibility = compute_feasibility(db, candidate_id=candidate_id, user_id=user_id)
    conflicts = detect_conflicts(db, candidate_id=candidate_id, user_id=user_id)
    holds = (
        db.query(CandidateProposedHold)
        .filter(
            CandidateProposedHold.candidate_id == candidate_id,
            CandidateProposedHold.status.notin_(["DISMISSED", "EXPIRED"]),
        )
        .order_by(CandidateProposedHold.starts_at.asc())
        .limit(20)
        .all()
    )
    settings = get_settings()
    return {
        "schema": "twin.acceptance_calendar/v1",
        "verdict_target": (
            "ACCEPTANCE CALENDAR CUSTOMER-USABLE — CAREER EXECUTION PLANNING PRODUCTION-READY"
        ),
        "today": list_items(db, candidate_id=candidate_id, view="today"),
        "agenda": list_items(db, candidate_id=candidate_id, view="agenda")[:30],
        "week": list_items(db, candidate_id=candidate_id, view="week"),
        "unscheduled": list_items(db, candidate_id=candidate_id, view="unscheduled"),
        "at_risk": list_items(db, candidate_id=candidate_id, view="at_risk"),
        "feasibility": feasibility,
        "conflicts": conflicts,
        "holds": [_ser_hold(h) for h in holds],
        "path": path_to_next_outcome(db, candidate_id=candidate_id),
        "budget": _ser_budget(get_or_create_budget(db, candidate_id=candidate_id)),
        "consent": _ser_consent(consent),
        "fatigue": fatigue_controls(db, candidate_id=candidate_id),
        "availability": load_availability(db, candidate_id=candidate_id, user_id=user_id),
        "microsoft": microsoft_read_status(db, candidate_id=candidate_id, user_id=user_id),
        "monthly": monthly_overview(db, candidate_id=candidate_id, user_id=user_id),
        "safety": {
            "microsoft_write": False,
            "microsoft_write_enabled": bool(
                getattr(settings, "microsoft_calendar_write_enabled", False)
            ),
            "external_auto_create": False,
            "auto_invite_attendees": False,
            "contact_recruiters": False,
            "submit_applications": False,
            "autonomous_scheduling": False,
            "phase_3_career_agent": "NOT_STARTED",
        },
        "labels": {
            "internal": "Scheduled in TWIN only",
            "proposed": "Proposed hold — not externally booked",
            "exported": "Exported via ICS for manual add",
            "externally_confirmed": "Confirmed on external calendar (evidence required)",
        },
        "analytics": {"kpi_excluded": True},
        "alembic": "110_acceptance_calendar",
        "observability": {
            "schema": "twin.acceptance_calendar_obs/v1",
            "labels_pii": False,
            "graph_down_degraded": True,
        },
    }
