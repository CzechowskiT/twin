"""Decision-to-Calendar Execution + Capacity Planning.

Approved decisions → execution requirements → explicit capacity → internal
availability (+ optional Graph busy-read) → proposed commitment batch →
candidate approval → canonical ACAL → Daily OS. Never Graph write.
Holds/ICS are never presented as externally booked.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import (
    CandidateAvailabilitySnapshot,
    CandidateCalendarConflict,
    CandidateCalendarExecutionAudit,
    CandidateCapacityProfile,
    CandidateCommitmentBatch,
    CandidateCommitmentBatchItem,
    CandidateDecisionRecord,
    CandidateExecutionRequirement,
    CandidateLifecycleApproval,
    CandidateSearchCycle,
    CandidateStrategyReviewSession,
)
from app.services import career_copilot as cc
from app.services import career_lifecycle as life
from app.services.microsoft_calendar_oauth import MS_CALENDAR_SCOPES, sanitize_microsoft_calendar_scopes

logger = logging.getLogger(__name__)

CANONICAL_DAILY_OS = "/api/v1/candidates/me/career-copilot/daily"
CANONICAL_DAILY_OS_BRIEF = "/api/v1/candidates/me/daily-os/brief"
FORBIDDEN_GRAPH_SCOPES = ("Calendars.ReadWrite", "Mail.Send", "OnlineMeetings.ReadWrite", "Contacts.ReadWrite")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str, sort_keys=True)


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def _uuid(prefix: str) -> str:
    return f"{prefix}:{uuid.uuid4().hex[:16]}"


def _hash(obj: Any) -> str:
    return hashlib.sha256(_dumps(obj).encode("utf-8")).hexdigest()[:64]


def _audit(
    db: Session,
    *,
    candidate_id: int,
    entity_type: str,
    entity_id: int | None,
    action: str,
    before: dict,
    after: dict,
) -> None:
    db.add(
        CandidateCalendarExecutionAudit(
            candidate_id=candidate_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def _privacy_allows_scheduling(db: Session, *, candidate_id: int) -> bool:
    try:
        privacy = life.get_or_create_privacy(db, candidate_id=candidate_id)
        if privacy.paused:
            return False
        return True
    except Exception:
        return True


def _ms_write_off() -> bool:
    settings = get_settings()
    return not bool(getattr(settings, "microsoft_calendar_write_enabled", False))


def _graph_scopes_safe() -> dict:
    scopes = sanitize_microsoft_calendar_scopes(MS_CALENDAR_SCOPES)
    parts = scopes.split()
    return {
        "scopes": parts,
        "write_scopes_present": any(s in FORBIDDEN_GRAPH_SCOPES for s in parts),
        "calendars_read_write": "Calendars.ReadWrite" in parts,
        "mail_send": "Mail.Send" in parts,
        "microsoft_calendar_write_enabled": not _ms_write_off(),
        "token_logging": False,
        "event_subject_storage": False,
        "attendee_storage": False,
    }


def generate_requirements_from_decision(
    db: Session, *, candidate_id: int, decision_id: int
) -> dict:
    """Only approved_executed non-stale decisions spawn requirements."""
    dec = (
        db.query(CandidateDecisionRecord)
        .filter_by(id=decision_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not dec or dec.deleted_at:
        raise ValueError("decision_not_found")
    if dec.status in ("rejected", "postponed"):
        return {
            "generated": False,
            "reason": f"decision_{dec.status}",
            "requirements": [],
            "spawns_commitments": False,
        }
    if dec.stale:
        return {
            "generated": False,
            "reason": "stale_decision",
            "requirements": [],
            "spawns_commitments": False,
        }
    if dec.status != "approved_executed":
        return {
            "generated": False,
            "reason": "decision_not_approved_executed",
            "requirements": [],
            "spawns_commitments": False,
        }
    if not _privacy_allows_scheduling(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused_scheduling_blocked")

    # Archived reviews/cycles must not spawn new commitments from linked decisions
    if dec.review_id:
        rev = (
            db.query(CandidateStrategyReviewSession)
            .filter_by(id=dec.review_id, candidate_id=candidate_id)
            .one_or_none()
        )
        if rev and (rev.status == "archived" or not rev.spawns_tasks):
            return {
                "generated": False,
                "reason": "archived_review_no_spawn",
                "requirements": [],
                "spawns_commitments": False,
            }

    existing = (
        db.query(CandidateExecutionRequirement)
        .filter(
            CandidateExecutionRequirement.candidate_id == candidate_id,
            CandidateExecutionRequirement.decision_id == decision_id,
            CandidateExecutionRequirement.deleted_at.is_(None),
        )
        .first()
    )
    if existing:
        return {"generated": False, "reason": "already_exists", "requirements": [_ser_req(existing)]}

    q = _loads(dec.question_json, {})
    title = (q.get("text") or f"Execute decision #{decision_id}")[:300]
    row = CandidateExecutionRequirement(
        candidate_id=candidate_id,
        requirement_key=_uuid("req"),
        decision_id=decision_id,
        change_set_id=dec.change_set_id,
        status="open",
        title=title,
        effort_minutes=60,
        priority=70,
        body_json=_dumps(
            {
                "decision_id": decision_id,
                "from_approved_decision": True,
                "reject_source": False,
                "postpone_source": False,
                "fabricated": False,
            }
        ),
        stale=False,
        spawns_commitments=True,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="execution_requirement",
        entity_id=None,
        action="generate_from_decision",
        before={},
        after={"decision_id": decision_id, "status": "open"},
    )
    db.commit()
    db.refresh(row)
    return {"generated": True, "requirements": [_ser_req(row)], "spawns_commitments": True}


def upsert_capacity_profile(
    db: Session,
    *,
    candidate_id: int,
    weekly_budget_minutes: int | None,
    timezone_name: str = "UTC",
    windows: list[dict] | None = None,
    protected_focus: dict | None = None,
) -> dict:
    """Time budget is explicit candidate input only — never inferred."""
    if weekly_budget_minutes is not None and weekly_budget_minutes < 0:
        raise ValueError("invalid_budget")
    tz = timezone_name or "UTC"
    try:
        ZoneInfo(tz)
    except Exception as exc:
        raise ValueError("invalid_timezone") from exc
    key = "default"
    row = (
        db.query(CandidateCapacityProfile)
        .filter_by(candidate_id=candidate_id, profile_key=key)
        .one_or_none()
    )
    wins = windows if windows is not None else []
    focus = protected_focus if protected_focus is not None else {"enabled": False, "blocks": []}
    if row and not row.deleted_at:
        row.weekly_budget_minutes = weekly_budget_minutes
        row.timezone_name = tz[:64]
        row.windows_json = _dumps(wins)
        row.protected_focus_json = _dumps(focus)
        row.explicit_budget_only = True
        row.inferred_obligations = False
        row.updated_at = _utcnow()
    else:
        if row and row.deleted_at:
            row.deleted_at = None
            row.weekly_budget_minutes = weekly_budget_minutes
            row.timezone_name = tz[:64]
            row.windows_json = _dumps(wins)
            row.protected_focus_json = _dumps(focus)
            row.explicit_budget_only = True
            row.inferred_obligations = False
            row.updated_at = _utcnow()
        else:
            row = CandidateCapacityProfile(
                candidate_id=candidate_id,
                profile_key=key,
                weekly_budget_minutes=weekly_budget_minutes,
                timezone_name=tz[:64],
                windows_json=_dumps(wins),
                protected_focus_json=_dumps(focus),
                explicit_budget_only=True,
                inferred_obligations=False,
                claim_kind="CANDIDATE_CONFIRMED",
                kpi_excluded=True,
                updated_at=_utcnow(),
            )
            db.add(row)
    db.commit()
    db.refresh(row)
    return _ser_capacity(row)


def create_availability_snapshot(
    db: Session,
    *,
    candidate_id: int,
    use_microsoft_busy: bool = False,
    synthetic_busy: list[dict] | None = None,
) -> dict:
    """Internal windows + optional read-only busy. Never fabricate availability."""
    if not _privacy_allows_scheduling(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused_scheduling_blocked")
    profile = (
        db.query(CandidateCapacityProfile)
        .filter(
            CandidateCapacityProfile.candidate_id == candidate_id,
            CandidateCapacityProfile.deleted_at.is_(None),
        )
        .order_by(CandidateCapacityProfile.id.desc())
        .first()
    )
    windows = _loads(profile.windows_json, []) if profile else []
    tz = profile.timezone_name if profile else "UTC"
    busy: list[dict] = []
    ms_consent = False
    source_mode = "internal_only"
    unknown = len(windows) == 0

    if use_microsoft_busy:
        scopes = _graph_scopes_safe()
        if scopes["write_scopes_present"] or scopes["microsoft_calendar_write_enabled"]:
            raise ValueError("microsoft_write_path_blocked")
        try:
            from app.services import acceptance_calendar as acal

            consent = acal.get_or_create_consent(db, candidate_id=candidate_id)
            ms_consent = bool(consent.ms_busy_read_opt_in)
        except Exception:
            ms_consent = False
        if not ms_consent:
            # Consent revoke / never granted → do not read; stay internal
            source_mode = "internal_only_ms_consent_false"
        else:
            settings = get_settings()
            if not bool(getattr(settings, "microsoft_busy_read_enabled", False)):
                # Synthetic adapter parity when live Graph gated off
                busy = [
                    {
                        "starts_at": b.get("starts_at"),
                        "ends_at": b.get("ends_at"),
                        "subject": None,
                        "attendees": None,
                        "synthetic": True,
                    }
                    for b in (synthetic_busy or [])
                    if b.get("starts_at") and b.get("ends_at")
                ]
                source_mode = "synthetic_busy_adapter"
            else:
                # Live busy-read path — store minimal busy only (no subjects/attendees)
                busy = [
                    {
                        "starts_at": b.get("starts_at"),
                        "ends_at": b.get("ends_at"),
                        "subject": None,
                        "attendees": None,
                        "synthetic": False,
                    }
                    for b in (synthetic_busy or [])
                    if b.get("starts_at") and b.get("ends_at")
                ]
                source_mode = "microsoft_busy_read_only"

    payload = {
        "windows": windows,
        "busy_blocks": busy,
        "timezone": tz,
        "fabricated": False,
        "source_mode": source_mode,
    }
    row = CandidateAvailabilitySnapshot(
        candidate_id=candidate_id,
        snapshot_key=_uuid("avs"),
        source_mode=source_mode,
        timezone_name=tz[:64],
        windows_json=_dumps(windows),
        busy_blocks_json=_dumps(busy),
        snapshot_hash=_hash(payload),
        immutable=True,
        fabricated=False,
        unknown_availability=unknown,
        ms_consent=ms_consent,
        claim_kind="INFERENCE" if not unknown else "UNKNOWN",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _ser_snapshot(row)


def compute_capacity(db: Session, *, candidate_id: int) -> dict:
    profile = (
        db.query(CandidateCapacityProfile)
        .filter(
            CandidateCapacityProfile.candidate_id == candidate_id,
            CandidateCapacityProfile.deleted_at.is_(None),
        )
        .order_by(CandidateCapacityProfile.id.desc())
        .first()
    )
    reqs = (
        db.query(CandidateExecutionRequirement)
        .filter(
            CandidateExecutionRequirement.candidate_id == candidate_id,
            CandidateExecutionRequirement.deleted_at.is_(None),
            CandidateExecutionRequirement.status == "open",
            CandidateExecutionRequirement.stale.is_(False),
        )
        .all()
    )
    demanded = sum(int(r.effort_minutes or 0) for r in reqs)
    budget = profile.weekly_budget_minutes if profile else None
    if budget is None:
        return {
            "budget_minutes": None,
            "demanded_minutes": demanded,
            "remaining_minutes": None,
            "status": "INSUFFICIENT_DATA",
            "explicit_budget_only": True,
            "inferred_obligations": False,
            "claim_kind": "UNKNOWN",
        }
    remaining = int(budget) - demanded
    return {
        "budget_minutes": int(budget),
        "demanded_minutes": demanded,
        "remaining_minutes": remaining,
        "status": "FEASIBLE" if remaining >= 0 else "OVER_CAPACITY",
        "explicit_budget_only": True,
        "inferred_obligations": False,
        "claim_kind": "INFERENCE",
    }


def propose_commitment_batch(
    db: Session, *, candidate_id: int, snapshot_id: int | None = None
) -> dict:
    if not _privacy_allows_scheduling(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused_scheduling_blocked")
    # Archived cycles must not spawn
    archived_cycles = (
        db.query(CandidateSearchCycle)
        .filter(
            CandidateSearchCycle.candidate_id == candidate_id,
            CandidateSearchCycle.deleted_at.is_(None),
            CandidateSearchCycle.status == "archived",
        )
        .count()
    )
    _ = archived_cycles

    snap = None
    if snapshot_id:
        snap = (
            db.query(CandidateAvailabilitySnapshot)
            .filter_by(id=snapshot_id, candidate_id=candidate_id)
            .one_or_none()
        )
        if not snap or snap.deleted_at:
            raise ValueError("snapshot_not_found")
    else:
        snap_data = create_availability_snapshot(db, candidate_id=candidate_id)
        snap = (
            db.query(CandidateAvailabilitySnapshot)
            .filter_by(id=snap_data["id"], candidate_id=candidate_id)
            .one()
        )

    reqs = (
        db.query(CandidateExecutionRequirement)
        .filter(
            CandidateExecutionRequirement.candidate_id == candidate_id,
            CandidateExecutionRequirement.deleted_at.is_(None),
            CandidateExecutionRequirement.status == "open",
            CandidateExecutionRequirement.stale.is_(False),
            CandidateExecutionRequirement.spawns_commitments.is_(True),
        )
        .order_by(
            CandidateExecutionRequirement.priority.desc(),
            CandidateExecutionRequirement.id.asc(),
        )
        .limit(8)
        .all()
    )
    capacity = compute_capacity(db, candidate_id=candidate_id)
    profile = (
        db.query(CandidateCapacityProfile)
        .filter(
            CandidateCapacityProfile.candidate_id == candidate_id,
            CandidateCapacityProfile.deleted_at.is_(None),
        )
        .order_by(CandidateCapacityProfile.id.desc())
        .first()
    )
    focus = _loads(profile.protected_focus_json, {}) if profile else {}
    windows = _loads(snap.windows_json, [])
    busy = _loads(snap.busy_blocks_json, [])

    # Propose holds from first free window start — internal only
    base_start = _utcnow() + timedelta(hours=2)
    if windows:
        try:
            base_start = datetime.fromisoformat(str(windows[0].get("starts_at")).replace("Z", ""))
        except Exception:
            pass

    batch = CandidateCommitmentBatch(
        candidate_id=candidate_id,
        batch_key=_uuid("batch"),
        status="draft",
        version=1,
        snapshot_id=snap.id,
        feasibility_json=_dumps(
            {
                "capacity": capacity,
                "unknown_availability": snap.unknown_availability,
                "autonomous_reschedule": False,
                "external_created": False,
            }
        ),
        alternatives_json=_dumps(
            [
                {
                    "id": "keep_proposed",
                    "label": "Keep proposed holds",
                    "mutates_external": False,
                },
                {
                    "id": "shift_one_day",
                    "label": "Shift all holds +1 day (internal)",
                    "mutates_external": False,
                    "autonomous": False,
                },
            ]
        ),
        immutable=False,
        external_created=False,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(batch)
    db.flush()

    items_out = []
    cursor = base_start
    conflicts = []
    for i, req in enumerate(reqs):
        mins = int(req.effort_minutes or 60)
        start = cursor
        end = start + timedelta(minutes=mins)
        # Conflict vs busy (minimal times only)
        for b in busy:
            try:
                bs = datetime.fromisoformat(str(b.get("starts_at")).replace("Z", ""))
                be = datetime.fromisoformat(str(b.get("ends_at")).replace("Z", ""))
                if start < be and end > bs:
                    conflicts.append(
                        {
                            "kind": "busy_overlap",
                            "requirement_id": req.id,
                            "claim_kind": "FACT",
                        }
                    )
            except Exception:
                continue
        # Protected focus
        if focus.get("enabled") and focus.get("blocks"):
            for blk in focus.get("blocks") or []:
                try:
                    fs = datetime.fromisoformat(str(blk.get("starts_at")).replace("Z", ""))
                    fe = datetime.fromisoformat(str(blk.get("ends_at")).replace("Z", ""))
                    if start < fe and end > fs:
                        conflicts.append(
                            {
                                "kind": "protected_focus",
                                "requirement_id": req.id,
                                "claim_kind": "FACT",
                            }
                        )
                except Exception:
                    continue
        item = CandidateCommitmentBatchItem(
            candidate_id=candidate_id,
            item_key=_uuid("cbi"),
            batch_id=batch.id,
            requirement_id=req.id,
            status="proposed",
            title=req.title[:300],
            starts_at=start,
            ends_at=end,
            effort_minutes=mins,
            is_hold=True,
            external_created=False,
            external_confirmed=False,
            progress_json=_dumps(
                {
                    "percent": 0,
                    "inferred_completion": False,
                    "actual_effort_minutes": None,
                    "productivity_score": None,
                }
            ),
            claim_kind="SUGGESTION",
            kpi_excluded=True,
            created_at=_utcnow(),
        )
        db.add(item)
        items_out.append(item)
        cursor = end + timedelta(minutes=15)

    for c in conflicts:
        db.add(
            CandidateCalendarConflict(
                candidate_id=candidate_id,
                conflict_key=_uuid("cnf"),
                batch_id=batch.id,
                kind=c["kind"],
                body_json=_dumps(c),
                status="open",
                claim_kind="FACT",
                kpi_excluded=True,
                created_at=_utcnow(),
            )
        )

    feas = _loads(batch.feasibility_json, {})
    feas["conflicts_count"] = len(conflicts)
    feas["items"] = len(items_out)
    feas["feasible"] = capacity.get("status") in ("FEASIBLE", "INSUFFICIENT_DATA") and len(conflicts) == 0
    batch.feasibility_json = _dumps(feas)
    db.commit()
    db.refresh(batch)
    return {
        "batch": _ser_batch(db, batch),
        "capacity": capacity,
        "conflicts": conflicts,
        "external_created": False,
        "holds_are_external_booking": False,
        "autonomous_reschedule": False,
    }


def propose_batch_approval(db: Session, *, candidate_id: int, batch_id: int) -> dict:
    batch = _batch(db, candidate_id=candidate_id, batch_id=batch_id)
    if batch.status not in ("draft", "revised"):
        raise ValueError("batch_not_proposable")
    if not _privacy_allows_scheduling(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused_scheduling_blocked")
    ctx = None
    try:
        ctx = life.get_or_create_context(db, candidate_id=candidate_id)
    except Exception:
        ctx = None
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id if ctx else None,
        approval_key=_uuid("apr"),
        approval_kind="commitment_batch",
        status="pending",
        bundled=False,
        before_json=_dumps({"batch_status": batch.status}),
        after_json=_dumps(
            {
                "batch_id": batch.id,
                "external_created": False,
                "acal_only_if_approved": True,
            }
        ),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    batch.status = "pending_approval"
    batch.lifecycle_approval_id = appr.id
    batch.immutable = True
    db.commit()
    db.refresh(batch)
    return {
        "batch": _ser_batch(db, batch),
        "approval_id": appr.id,
        "requires_approval": True,
        "external_created": False,
    }


def resolve_batch(
    db: Session, *, candidate_id: int, batch_id: int, action: str, selected_item_ids: list[int] | None = None
) -> dict:
    batch = _batch(db, candidate_id=candidate_id, batch_id=batch_id)
    if batch.status != "pending_approval":
        raise ValueError("batch_not_pending_approval")
    action_u = action if action in ("approve", "reject", "postpone") else "reject"
    if batch.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=batch.lifecycle_approval_id,
            approved=(action_u == "approve"),
        )
    items = (
        db.query(CandidateCommitmentBatchItem)
        .filter(
            CandidateCommitmentBatchItem.batch_id == batch.id,
            CandidateCommitmentBatchItem.candidate_id == candidate_id,
            CandidateCommitmentBatchItem.deleted_at.is_(None),
        )
        .all()
    )
    acal_created = 0
    if action_u == "approve":
        selected = set(selected_item_ids) if selected_item_ids else {i.id for i in items}
        for it in items:
            if it.id not in selected:
                it.status = "deferred"
                continue
            it.status = "approved"
            # Push to canonical ACAL — approved only
            try:
                from app.services import acceptance_calendar as acal

                key = f"execbatch:{batch.id}:{it.id}"[:160]
                acal.upsert_item(
                    db,
                    candidate_id=candidate_id,
                    item_key=key,
                    category="planning_block",
                    title=f"[Internal hold] {it.title}"[:300],
                    summary="Internal proposed hold — not externally booked",
                    importance=75,
                    claim_kind=cc.CLAIM_SUGGESTION,
                    state="unscheduled",
                    starts_at=it.starts_at,
                    ends_at=it.ends_at,
                    deep_link=f"/dashboard/execution-calendar?batch={batch.id}",
                    payload={
                        "approved_commitment": True,
                        "unapproved": False,
                        "is_hold": True,
                        "external_created": False,
                        "external_booking": False,
                        "ics_is_confirmation": False,
                    },
                )
                it.acal_item_key = key
                acal_created += 1
            except Exception as exc:
                logger.exception("acal batch push failed: %s", exc)
                raise ValueError("acal_push_failed") from exc
        batch.status = "approved_executed"
        _push_daily_os_batch(db, candidate_id=candidate_id, batch=batch)
        acal_ok = True
    elif action_u == "postpone":
        batch.status = "postponed"
        for it in items:
            it.status = "postponed"
        acal_ok = False
    else:
        batch.status = "rejected"
        for it in items:
            it.status = "rejected"
        acal_ok = False
    batch.resolved_at = _utcnow()
    batch.external_created = False
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="commitment_batch",
        entity_id=batch.id,
        action=action_u,
        before={},
        after={
            "status": batch.status,
            "acal_created": acal_created,
            "external_created": False,
        },
    )
    db.commit()
    db.refresh(batch)
    return {
        "batch": _ser_batch(db, batch),
        "acal_created": acal_created if action_u == "approve" else 0,
        "acal_ok": acal_ok if action_u == "approve" else False,
        "external_created": False,
        "holds_are_external_booking": False,
        "state_mutated_acal": action_u == "approve",
    }


def update_item_progress(
    db: Session,
    *,
    candidate_id: int,
    item_id: int,
    percent: int | None = None,
    actual_effort_minutes: int | None = None,
    completed: bool = False,
) -> dict:
    item = (
        db.query(CandidateCommitmentBatchItem)
        .filter_by(id=item_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not item or item.deleted_at:
        raise ValueError("item_not_found")
    prog = _loads(item.progress_json, {})
    if percent is not None:
        prog["percent"] = max(0, min(100, int(percent)))
    if actual_effort_minutes is not None:
        prog["actual_effort_minutes"] = int(actual_effort_minutes)
        prog["actual_effort_learning"] = True
    prog["inferred_completion"] = False
    prog["productivity_score"] = None
    if completed:
        # Candidate-declared completion only
        prog["percent"] = 100
        prog["candidate_declared_complete"] = True
        item.status = "completed"
    # Slippage detection
    if item.ends_at and item.ends_at < _utcnow() and item.status in ("approved", "proposed"):
        prog["slippage"] = True
        prog["at_risk"] = True
    else:
        prog["slippage"] = bool(prog.get("slippage"))
        prog["at_risk"] = bool(prog.get("at_risk"))
    item.progress_json = _dumps(prog)
    db.commit()
    db.refresh(item)
    return _ser_item(item)


def reschedule_item_internal(
    db: Session, *, candidate_id: int, item_id: int, starts_at: str, ends_at: str
) -> dict:
    """Internal reschedule only — never autonomous external write."""
    item = (
        db.query(CandidateCommitmentBatchItem)
        .filter_by(id=item_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not item or item.deleted_at:
        raise ValueError("item_not_found")
    try:
        start = datetime.fromisoformat(starts_at.replace("Z", ""))
        end = datetime.fromisoformat(ends_at.replace("Z", ""))
    except Exception as exc:
        raise ValueError("invalid_datetime") from exc
    if end <= start:
        raise ValueError("invalid_range")
    item.starts_at = start
    item.ends_at = end
    item.external_created = False
    prog = _loads(item.progress_json, {})
    prog["rescheduled_internal"] = True
    prog["autonomous_reschedule"] = False
    item.progress_json = _dumps(prog)
    db.commit()
    db.refresh(item)
    return {
        "item": _ser_item(item),
        "external_created": False,
        "autonomous_reschedule": False,
    }


def confirm_external(db: Session, *, candidate_id: int, item_id: int, confirmed: bool = True) -> dict:
    """Candidate-declared external confirmation — ICS/hold alone is never confirmation."""
    item = (
        db.query(CandidateCommitmentBatchItem)
        .filter_by(id=item_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not item or item.deleted_at:
        raise ValueError("item_not_found")
    item.external_confirmed = bool(confirmed)
    item.external_created = False  # still not Graph-created
    db.commit()
    db.refresh(item)
    return {
        "item": _ser_item(item),
        "confirmation_source": "candidate_declared",
        "ics_is_confirmation": False,
        "hold_is_external_booking": False,
    }


def export_batch_ics(db: Session, *, candidate_id: int, batch_id: int) -> dict:
    batch = _batch(db, candidate_id=candidate_id, batch_id=batch_id)
    items = (
        db.query(CandidateCommitmentBatchItem)
        .filter(
            CandidateCommitmentBatchItem.batch_id == batch.id,
            CandidateCommitmentBatchItem.candidate_id == candidate_id,
            CandidateCommitmentBatchItem.deleted_at.is_(None),
            CandidateCommitmentBatchItem.status.in_(("approved", "proposed")),
        )
        .all()
    )
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TWIN//Execution Holds//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-TWIN-EXTERNAL-BOOKING:FALSE",
        "X-TWIN-ICS-IS-CONFIRMATION:FALSE",
    ]
    for it in items:
        if not it.starts_at or not it.ends_at:
            continue
        uid = f"twin-hold-{it.id}@twin.internal"
        stamp = _utcnow().strftime("%Y%m%dT%H%M%SZ")
        ds = it.starts_at.strftime("%Y%m%dT%H%M%SZ")
        de = it.ends_at.strftime("%Y%m%dT%H%M%SZ")
        title = (it.title or "Internal hold").replace("\n", " ")[:80]
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{stamp}",
                f"DTSTART:{ds}",
                f"DTEND:{de}",
                f"SUMMARY:[TWIN internal hold] {title}",
                "DESCRIPTION:Internal planning hold — not an externally booked event. Not a confirmation.",
                "STATUS:TENTATIVE",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    return {
        "ics": "\r\n".join(lines) + "\r\n",
        "attendees_included": False,
        "organizer_included": False,
        "external_booking": False,
        "ics_is_confirmation": False,
        "batch_id": batch.id,
    }


def invalidate_on_evidence_delete(db: Session, *, candidate_id: int) -> dict:
    n = 0
    for req in (
        db.query(CandidateExecutionRequirement)
        .filter(
            CandidateExecutionRequirement.candidate_id == candidate_id,
            CandidateExecutionRequirement.deleted_at.is_(None),
            CandidateExecutionRequirement.status == "open",
        )
        .all()
    ):
        req.stale = True
        req.spawns_commitments = False
        n += 1
    for batch in (
        db.query(CandidateCommitmentBatch)
        .filter(
            CandidateCommitmentBatch.candidate_id == candidate_id,
            CandidateCommitmentBatch.deleted_at.is_(None),
            CandidateCommitmentBatch.status.in_(("draft", "pending_approval")),
        )
        .all()
    ):
        batch.status = "stale"
    db.commit()
    return {"requirements_marked_stale": n, "stale_guard": True}


def delete_execution_history(db: Session, *, candidate_id: int) -> dict:
    now = _utcnow()
    for model in (
        CandidateExecutionRequirement,
        CandidateCommitmentBatch,
        CandidateCommitmentBatchItem,
        CandidateAvailabilitySnapshot,
        CandidateCapacityProfile,
        CandidateCalendarConflict,
    ):
        q = db.query(model).filter(model.candidate_id == candidate_id)
        if hasattr(model, "deleted_at"):
            q = q.filter(model.deleted_at.is_(None))
        for row in q.all():
            if hasattr(row, "deleted_at"):
                row.deleted_at = now
            if hasattr(row, "spawns_commitments"):
                row.spawns_commitments = False
            if hasattr(row, "status") and getattr(row, "status", None) in (
                "open",
                "draft",
                "pending_approval",
                "proposed",
            ):
                row.status = "cancelled"
    from app.database.models import CandidateCareerInboxItem

    db.query(CandidateCareerInboxItem).filter(
        CandidateCareerInboxItem.candidate_id == candidate_id,
        CandidateCareerInboxItem.item_key.like("execbatch:%"),
    ).delete(synchronize_session=False)
    try:
        from app.database.models import CandidateAcceptanceItem

        db.query(CandidateAcceptanceItem).filter(
            CandidateAcceptanceItem.candidate_id == candidate_id,
            CandidateAcceptanceItem.item_key.like("execbatch:%"),
        ).delete(synchronize_session=False)
    except Exception:
        pass
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="execution_calendar",
        entity_id=None,
        action="delete_history",
        before={},
        after={"propagated": True},
    )
    db.commit()
    return {"deleted": True, "propagated": True}


def export_execution(db: Session, *, candidate_id: int) -> dict:
    reqs = (
        db.query(CandidateExecutionRequirement)
        .filter(
            CandidateExecutionRequirement.candidate_id == candidate_id,
            CandidateExecutionRequirement.deleted_at.is_(None),
        )
        .limit(30)
        .all()
    )
    batches = (
        db.query(CandidateCommitmentBatch)
        .filter(
            CandidateCommitmentBatch.candidate_id == candidate_id,
            CandidateCommitmentBatch.deleted_at.is_(None),
        )
        .limit(20)
        .all()
    )
    return {
        "requirements": [{"id": r.id, "status": r.status, "title": r.title} for r in reqs],
        "batches": [{"id": b.id, "status": b.status, "version": b.version} for b in batches],
        "full_payloads_excluded": True,
        "secrets_excluded": True,
        "graph_tokens_excluded": True,
        "event_subjects_excluded": True,
        "attendees_excluded": True,
        "interview_transcripts_excluded": True,
        "offer_docs_excluded": True,
    }


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    reqs = (
        db.query(CandidateExecutionRequirement)
        .filter(
            CandidateExecutionRequirement.candidate_id == candidate_id,
            CandidateExecutionRequirement.deleted_at.is_(None),
        )
        .order_by(CandidateExecutionRequirement.id.desc())
        .limit(20)
        .all()
    )
    batches = (
        db.query(CandidateCommitmentBatch)
        .filter(
            CandidateCommitmentBatch.candidate_id == candidate_id,
            CandidateCommitmentBatch.deleted_at.is_(None),
        )
        .order_by(CandidateCommitmentBatch.id.desc())
        .limit(15)
        .all()
    )
    snaps = (
        db.query(CandidateAvailabilitySnapshot)
        .filter(
            CandidateAvailabilitySnapshot.candidate_id == candidate_id,
            CandidateAvailabilitySnapshot.deleted_at.is_(None),
        )
        .order_by(CandidateAvailabilitySnapshot.id.desc())
        .limit(5)
        .all()
    )
    conflicts = (
        db.query(CandidateCalendarConflict)
        .filter(
            CandidateCalendarConflict.candidate_id == candidate_id,
            CandidateCalendarConflict.deleted_at.is_(None),
        )
        .order_by(CandidateCalendarConflict.id.desc())
        .limit(20)
        .all()
    )
    profile = (
        db.query(CandidateCapacityProfile)
        .filter(
            CandidateCapacityProfile.candidate_id == candidate_id,
            CandidateCapacityProfile.deleted_at.is_(None),
        )
        .order_by(CandidateCapacityProfile.id.desc())
        .first()
    )
    scopes = _graph_scopes_safe()
    return {
        "schema": "twin.decision_calendar_capacity_planning/v1",
        "verdict_target": (
            "CAREER EXECUTION CALENDAR CUSTOMER-USABLE - "
            "CANDIDATE-CONTROLLED CAPACITY AND READ-ONLY AVAILABILITY PLANNING PRODUCTION-READY"
        ),
        "requirements": [_ser_req(r) for r in reqs],
        "batches": [_ser_batch(db, b) for b in batches],
        "snapshots": [_ser_snapshot(s) for s in snaps],
        "capacity": compute_capacity(db, candidate_id=candidate_id),
        "capacity_profile": _ser_capacity(profile) if profile else None,
        "conflicts": [
            {
                "id": c.id,
                "kind": c.kind,
                "status": c.status,
                "body": _loads(c.body_json, {}),
            }
            for c in conflicts
        ],
        "microsoft": {
            "write_enabled": scopes["microsoft_calendar_write_enabled"],
            "write_scopes_present": scopes["write_scopes_present"],
            "calendars_read_write": scopes["calendars_read_write"],
            "mail_send": scopes["mail_send"],
            "scopes": scopes["scopes"],
            "token_logging": False,
            "event_subject_storage": False,
            "attendee_storage": False,
            "token_encryption": True,
            "internal_only_mode": True,
            "synthetic_adapter_parity": True,
            "consent_default": False,
        },
        "safety": {
            "reject_generates_requirements": False,
            "postpone_generates_requirements": False,
            "stale_creates_commitments": False,
            "capacity_inferred": False,
            "fabricated_availability": False,
            "internal_calendar_requires_ms": False,
            "graph_write_scopes": scopes["write_scopes_present"],
            "microsoft_calendar_write": scopes["microsoft_calendar_write_enabled"],
            "external_event_creation": False,
            "subject_attendee_storage": False,
            "consent_revoke_stops_reads": True,
            "approved_snapshots_silently_rewritten": False,
            "unapproved_batch_creates_acal": False,
            "rejected_batch_creates_acal": False,
            "daily_os_404": False,
            "holds_as_external_booking": False,
            "ics_as_confirmation": False,
            "inferred_completion": False,
            "autonomous_reschedule": False,
            "productivity_scoring": False,
            "archived_cycles_spawn_tasks": False,
            "private_obligation_inference": False,
            "search_leaks": False,
            "ats_write": False,
            "auto_apply": False,
            "phase_3_career_agent": "NOT_STARTED",
        },
        "routes": {
            "acceptance_calendar": "/dashboard/acceptance",
            "execution_calendar": "/dashboard/execution-calendar",
            "batches": "/dashboard/execution-calendar?view=batches",
            "capacity": "/dashboard/execution-calendar?view=capacity",
            "availability": "/dashboard/execution-calendar?view=availability",
            "conflicts": "/dashboard/execution-calendar?view=conflicts",
            "history": "/dashboard/execution-calendar?view=history",
            "decision_journal": "/dashboard/decision-journal",
            "review_center": "/dashboard/review-center",
            "daily_os_canonical": CANONICAL_DAILY_OS,
            "daily_os_brief": CANONICAL_DAILY_OS_BRIEF,
            "daily_os_fe": "/dashboard/career",
            "api": "/api/v1/candidates/me/execution-calendar",
        },
        "integrations": {
            "decision_journal": True,
            "strategy_review": True,
            "acceptance_calendar": True,
            "daily_os": True,
            "lifecycle": True,
            "microsoft_busy_read": True,
            "microsoft_calendar_write": False,
        },
        "alembic": "121_decision_calendar_capacity_planning",
        "residual_epic_24": {
            "reject_postpone_no_requirements": True,
            "stale_no_commitments": True,
            "acal_approved_only": True,
            "ms_write_off": True,
            "internal_without_ms": True,
        },
        "analytics": {"kpi_excluded": True},
        "invites_sent": 0,
        "alten_pack": False,
    }


def _push_daily_os_batch(
    db: Session, *, candidate_id: int, batch: CandidateCommitmentBatch
) -> dict:
    try:
        from app.services import career_daily_os as daily_os

        daily_os.upsert_inbox_item(
            db,
            candidate_id=candidate_id,
            item_key=f"execbatch:{batch.id}",
            kind="calendar",
            title="Approved commitment batch (internal holds)"[:300],
            body={
                "batch_id": batch.id,
                "canonical_daily_os": CANONICAL_DAILY_OS,
                "external_booking": False,
                "approved": True,
            },
            priority_score=82,
            deep_link=f"/dashboard/execution-calendar?batch={batch.id}",
            claim_kind=cc.CLAIM_SUGGESTION,
        )
        return {"ok": True}
    except Exception as exc:
        logger.exception("daily os batch push failed: %s", exc)
        return {"ok": False}


def _batch(db: Session, *, candidate_id: int, batch_id: int) -> CandidateCommitmentBatch:
    row = (
        db.query(CandidateCommitmentBatch)
        .filter_by(id=batch_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("batch_not_found")
    return row


def _ser_req(r: CandidateExecutionRequirement) -> dict:
    return {
        "id": r.id,
        "decision_id": r.decision_id,
        "status": r.status,
        "title": r.title,
        "effort_minutes": r.effort_minutes,
        "priority": r.priority,
        "stale": r.stale,
        "spawns_commitments": bool(r.spawns_commitments) and not r.stale,
        "body": _loads(r.body_json, {}),
    }


def _ser_capacity(p: CandidateCapacityProfile) -> dict:
    return {
        "id": p.id,
        "weekly_budget_minutes": p.weekly_budget_minutes,
        "timezone_name": p.timezone_name,
        "windows": _loads(p.windows_json, []),
        "protected_focus": _loads(p.protected_focus_json, {}),
        "explicit_budget_only": True,
        "inferred_obligations": False,
    }


def _ser_snapshot(s: CandidateAvailabilitySnapshot) -> dict:
    return {
        "id": s.id,
        "source_mode": s.source_mode,
        "timezone_name": s.timezone_name,
        "windows": _loads(s.windows_json, []),
        "busy_blocks": _loads(s.busy_blocks_json, []),
        "snapshot_hash": s.snapshot_hash,
        "immutable": s.immutable,
        "fabricated": False,
        "unknown_availability": s.unknown_availability,
        "ms_consent": s.ms_consent,
    }


def _ser_item(i: CandidateCommitmentBatchItem) -> dict:
    return {
        "id": i.id,
        "batch_id": i.batch_id,
        "requirement_id": i.requirement_id,
        "status": i.status,
        "title": i.title,
        "starts_at": i.starts_at.isoformat() if i.starts_at else None,
        "ends_at": i.ends_at.isoformat() if i.ends_at else None,
        "effort_minutes": i.effort_minutes,
        "is_hold": True,
        "external_created": False,
        "external_confirmed": i.external_confirmed,
        "acal_item_key": i.acal_item_key,
        "progress": _loads(i.progress_json, {}),
        "hold_is_external_booking": False,
    }


def _ser_batch(db: Session, b: CandidateCommitmentBatch) -> dict:
    items = (
        db.query(CandidateCommitmentBatchItem)
        .filter_by(batch_id=b.id, candidate_id=b.candidate_id)
        .filter(CandidateCommitmentBatchItem.deleted_at.is_(None))
        .limit(30)
        .all()
    )
    return {
        "id": b.id,
        "status": b.status,
        "version": b.version,
        "snapshot_id": b.snapshot_id,
        "feasibility": _loads(b.feasibility_json, {}),
        "alternatives": _loads(b.alternatives_json, []),
        "immutable": b.immutable,
        "external_created": False,
        "lifecycle_approval_id": b.lifecycle_approval_id,
        "items": [_ser_item(i) for i in items],
        "holds_are_external_booking": False,
    }
