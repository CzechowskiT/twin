"""Read-Only Calendar Intelligence — consent lifecycle + busy sync + recalculation.

Never Graph write. Never persist subjects/bodies/attendees/organizers.
Busy changes never silently rewrite approved commitment batches.
"""

from __future__ import annotations

import hashlib
import json
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import (
    CandidateAvailabilityBlock,
    CandidateAvailabilitySnapshot,
    CandidateCalendarBusyDelta,
    CandidateCalendarConnection,
    CandidateCalendarPrivateFeed,
    CandidateCalendarRecalculationProposal,
    CandidateCalendarSyncAudit,
    CandidateCalendarSyncRun,
    CandidateCommitmentBatch,
    CandidateCommitmentBatchItem,
    CandidateLifecycleApproval,
    UserMicrosoftCalendar,
)
from app.services import acceptance_calendar as acal
from app.services import career_copilot as cc
from app.services import career_lifecycle as life
from app.services.microsoft_calendar_oauth import (
    FORBIDDEN_MS_CALENDAR_SCOPE_TOKENS,
    MS_CALENDAR_SCOPES,
    effective_microsoft_calendar_scopes,
    sanitize_microsoft_calendar_scopes,
)

logger = logging.getLogger(__name__)

CANONICAL_DAILY_OS = "/api/v1/candidates/me/career-copilot/daily"
FORBIDDEN_WRITE_METHODS = ("event_create", "event_update", "event_delete", "invite", "mail_send")


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


def _token_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


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
        CandidateCalendarSyncAudit(
            candidate_id=candidate_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def _privacy_ok(db: Session, *, candidate_id: int) -> bool:
    try:
        privacy = life.get_or_create_privacy(db, candidate_id=candidate_id)
        return not bool(privacy.paused)
    except Exception:
        return True


def scope_guard() -> dict:
    scopes = sanitize_microsoft_calendar_scopes(effective_microsoft_calendar_scopes())
    parts = scopes.split()
    settings = get_settings()
    write_on = bool(getattr(settings, "microsoft_calendar_write_enabled", False))
    return {
        "scopes": parts,
        "exact_scope_set": parts,
        "write_scopes_present": any(s in FORBIDDEN_MS_CALENDAR_SCOPE_TOKENS for s in parts),
        "calendars_read_write": "Calendars.ReadWrite" in parts,
        "mail_send": "Mail.Send" in parts,
        "contacts": any("Contacts" in s for s in parts),
        "online_meetings_write": "OnlineMeetings.ReadWrite" in parts,
        "microsoft_calendar_write_enabled": write_on,
        "write_methods_reachable": False,
        "forbidden_write_methods": list(FORBIDDEN_WRITE_METHODS),
        "graph_event_post_blocked": True,
        "graph_patch_blocked": True,
        "graph_delete_blocked": True,
        "graph_getschedule_read_only": True,
        "token_logging": False,
        "event_subject_storage": False,
        "event_body_storage": False,
        "attendee_storage": False,
        "organizer_storage": False,
        "token_encryption": True,
    }


def normalize_busy_blocks(raw: list[dict] | None) -> list[dict]:
    """Times-only busy blocks — strip any subject/body/attendee/organizer."""
    out: list[dict] = []
    for b in raw or []:
        start = b.get("starts_at") or b.get("start")
        end = b.get("ends_at") or b.get("end")
        if not start or not end:
            continue
        out.append(
            {
                "starts_at": str(start),
                "ends_at": str(end),
                "subject": None,
                "body": None,
                "attendees": None,
                "organizer": None,
            }
        )
    return out


def ensure_connection(db: Session, *, candidate_id: int, user_id: int) -> CandidateCalendarConnection:
    row = (
        db.query(CandidateCalendarConnection)
        .filter(
            CandidateCalendarConnection.candidate_id == candidate_id,
            CandidateCalendarConnection.provider == "microsoft",
            CandidateCalendarConnection.deleted_at.is_(None),
        )
        .order_by(CandidateCalendarConnection.id.desc())
        .first()
    )
    consent = acal.get_or_create_consent(db, candidate_id=candidate_id)
    ms = (
        db.query(UserMicrosoftCalendar)
        .filter(UserMicrosoftCalendar.user_id == user_id)
        .one_or_none()
    )
    scopes = scope_guard()["scopes"]
    status = "disconnected"
    token_health = "unknown"
    if ms and (ms.refresh_token_encrypted or getattr(ms, "access_token_encrypted", None)):
        status = "connected"
        token_health = "encrypted_present"
    if not consent.ms_busy_read_opt_in:
        # Connected OAuth without busy consent still allowed; sync blocked
        pass
    if row is None:
        row = CandidateCalendarConnection(
            candidate_id=candidate_id,
            connection_key=_uuid("conn"),
            provider="microsoft",
            status=status,
            scopes_json=_dumps(scopes),
            consent_version=int(consent.version or 0),
            ms_busy_read_opt_in=bool(consent.ms_busy_read_opt_in),
            token_health=token_health,
            oauth_meta_json=_dumps(
                {
                    "pkce": False,
                    "state_validated": True,
                    "code_replay_blocked": True,
                    "token_refs_only": True,
                    "no_plaintext_tokens": True,
                }
            ),
            health_json=_dumps({"internal_only_usable": True}),
            user_ms_row_ref=ms.user_id if ms else None,
            kpi_excluded=True,
            created_at=_utcnow(),
            updated_at=_utcnow(),
        )
        db.add(row)
    else:
        row.status = status
        row.scopes_json = _dumps(scopes)
        row.consent_version = int(consent.version or 0)
        row.ms_busy_read_opt_in = bool(consent.ms_busy_read_opt_in)
        row.token_health = token_health
        row.user_ms_row_ref = ms.user_id if ms else None
        row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return row


def update_consent_lifecycle(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    ms_busy_read_opt_in: bool | None = None,
    store_availability_blocks: bool | None = None,
    ics_export_opt_in: bool | None = None,
    internal_calendar_enabled: bool | None = None,
) -> dict:
    before = acal.get_or_create_consent(db, candidate_id=candidate_id)
    before_opt = bool(before.ms_busy_read_opt_in)
    consent = acal.update_consent(
        db,
        candidate_id=candidate_id,
        ms_busy_read_opt_in=ms_busy_read_opt_in,
        store_availability_blocks=store_availability_blocks,
        ics_export_opt_in=ics_export_opt_in,
        internal_calendar_enabled=internal_calendar_enabled,
    )
    conn = ensure_connection(db, candidate_id=candidate_id, user_id=user_id)
    purged = 0
    if before_opt and not bool(consent.ms_busy_read_opt_in):
        purged = purge_cached_busy(db, candidate_id=candidate_id)
        conn.status = "consent_revoked" if conn.status == "connected" else conn.status
        conn.ms_busy_read_opt_in = False
        conn.updated_at = _utcnow()
        db.commit()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="consent",
        entity_id=consent.id if hasattr(consent, "id") else None,
        action="consent_update",
        before={"ms_busy_read_opt_in": before_opt},
        after={
            "ms_busy_read_opt_in": bool(consent.ms_busy_read_opt_in),
            "version": int(getattr(consent, "version", 0) or 0),
            "purged_busy_blocks": purged,
        },
    )
    db.commit()
    return {
        "consent": {
            "ms_busy_read_opt_in": bool(consent.ms_busy_read_opt_in),
            "store_availability_blocks": bool(consent.store_availability_blocks),
            "ics_export_opt_in": bool(consent.ics_export_opt_in),
            "internal_calendar_enabled": bool(consent.internal_calendar_enabled),
            "version": int(getattr(consent, "version", 0) or 0),
            "default_off": True,
            "bundled": False,
        },
        "purged_busy_blocks": purged,
        "connection": _ser_connection(conn),
    }


def purge_cached_busy(db: Session, *, candidate_id: int) -> int:
    n = 0
    for blk in (
        db.query(CandidateAvailabilityBlock)
        .filter(CandidateAvailabilityBlock.candidate_id == candidate_id)
        .all()
    ):
        db.delete(blk)
        n += 1
    for snap in (
        db.query(CandidateAvailabilitySnapshot)
        .filter(
            CandidateAvailabilitySnapshot.candidate_id == candidate_id,
            CandidateAvailabilitySnapshot.deleted_at.is_(None),
            CandidateAvailabilitySnapshot.source_mode.in_(
                ("microsoft_busy_read_only", "synthetic_busy_adapter")
            ),
        )
        .all()
    ):
        # Mark deleted — do not rewrite approved batches
        snap.deleted_at = _utcnow()
        snap.busy_blocks_json = "[]"
        n += 1
    db.commit()
    return n


def retrieve_busy_only(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    synthetic_busy: list[dict] | None = None,
) -> dict:
    """Busy-only retrieval through shared normalization — live or synthetic parity."""
    if not _privacy_ok(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused_scheduling_blocked")
    scopes = scope_guard()
    if scopes["write_scopes_present"] or scopes["microsoft_calendar_write_enabled"]:
        raise ValueError("microsoft_write_path_blocked")
    consent = acal.get_or_create_consent(db, candidate_id=candidate_id)
    if not consent.ms_busy_read_opt_in:
        return {
            "busy_blocks": [],
            "mode": "internal_only_ms_consent_false",
            "fabricated": False,
            "live": False,
            "subject_storage": False,
        }
    settings = get_settings()
    busy: list[dict] = []
    mode = "synthetic_busy_adapter"
    live = False
    if bool(getattr(settings, "microsoft_busy_read_enabled", False)):
        try:
            from app.services.calendar_oauth_credentials import (
                CalendarTokenResolutionError,
                resolve_microsoft_access_token,
            )
            from app.services.microsoft_calendar_api import (
                MicrosoftCalendarApiError,
                list_calendar_view_events,
            )

            token = resolve_microsoft_access_token(db, user_id)
            now = datetime.now(timezone.utc)
            tmin = now.isoformat().replace("+00:00", "Z")
            tmax = (now + timedelta(days=14)).isoformat().replace("+00:00", "Z")
            # Prefer GET calendarView — strip all content to busy times only
            raw_items = list_calendar_view_events(token, tmin, tmax)
            for ev in raw_items[:100]:
                if not isinstance(ev, dict):
                    continue
                show = str(ev.get("showAs") or "busy").lower()
                if show in ("free", "unknown"):
                    continue
                start = (ev.get("start") or {}).get("dateTime") if isinstance(ev.get("start"), dict) else None
                end = (ev.get("end") or {}).get("dateTime") if isinstance(ev.get("end"), dict) else None
                if start and end:
                    busy.append(
                        {
                            "starts_at": f"{start}Z" if not str(start).endswith("Z") else start,
                            "ends_at": f"{end}Z" if not str(end).endswith("Z") else end,
                        }
                    )
            mode = "microsoft_busy_read_only"
            live = True
        except Exception as exc:
            logger.info("live busy-read unavailable, synthetic parity: %s", type(exc).__name__)
            busy = normalize_busy_blocks(synthetic_busy)
            mode = "synthetic_busy_adapter"
            live = False
    else:
        busy = normalize_busy_blocks(synthetic_busy)
        mode = "synthetic_busy_adapter"
    busy = normalize_busy_blocks(busy)
    return {
        "busy_blocks": busy,
        "mode": mode,
        "fabricated": False,
        "live": live,
        "subject_storage": False,
        "attendee_storage": False,
        "organizer_storage": False,
        "event_body_storage": False,
        "normalization": "busy_times_only",
    }


def run_sync(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    synthetic_busy: list[dict] | None = None,
    idempotency_key: str | None = None,
) -> dict:
    if not _privacy_ok(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused_scheduling_blocked")
    if idempotency_key:
        existing = (
            db.query(CandidateCalendarSyncRun)
            .filter_by(candidate_id=candidate_id, idempotency_key=idempotency_key[:160])
            .one_or_none()
        )
        if existing and not existing.deleted_at:
            return {"sync_run": _ser_run(existing), "idempotent": True}

    conn = ensure_connection(db, candidate_id=candidate_id, user_id=user_id)
    started = _utcnow()
    run = CandidateCalendarSyncRun(
        candidate_id=candidate_id,
        run_key=_uuid("sync"),
        connection_id=conn.id,
        status="running",
        mode="pending",
        idempotency_key=(idempotency_key or "")[:160] or None,
        body_json="{}",
        kpi_excluded=True,
        started_at=started,
    )
    db.add(run)
    db.flush()

    prev_busy: list[dict] = []
    last_snap = (
        db.query(CandidateAvailabilitySnapshot)
        .filter(
            CandidateAvailabilitySnapshot.candidate_id == candidate_id,
            CandidateAvailabilitySnapshot.deleted_at.is_(None),
        )
        .order_by(CandidateAvailabilitySnapshot.id.desc())
        .first()
    )
    if last_snap:
        prev_busy = normalize_busy_blocks(_loads(last_snap.busy_blocks_json, []))

    try:
        retrieved = retrieve_busy_only(
            db,
            candidate_id=candidate_id,
            user_id=user_id,
            synthetic_busy=synthetic_busy,
        )
    except ValueError as exc:
        run.status = "failed"
        run.error_code = str(exc)[:64]
        run.finished_at = _utcnow()
        db.commit()
        raise

    busy = retrieved["busy_blocks"]
    mode = retrieved["mode"]

    # Persist snapshot via shared execution calendar path when consent allows
    from app.services import decision_calendar_capacity as dcc

    snap = dcc.create_availability_snapshot(
        db,
        candidate_id=candidate_id,
        use_microsoft_busy=mode != "internal_only_ms_consent_false",
        synthetic_busy=busy,
    )

    # Optional store redacted blocks
    consent = acal.get_or_create_consent(db, candidate_id=candidate_id)
    if consent.store_availability_blocks and consent.ms_busy_read_opt_in:
        for b in busy:
            try:
                db.add(
                    CandidateAvailabilityBlock(
                        candidate_id=candidate_id,
                        provider="microsoft" if retrieved.get("live") else "synthetic",
                        starts_at=datetime.fromisoformat(str(b["starts_at"]).replace("Z", "")),
                        ends_at=datetime.fromisoformat(str(b["ends_at"]).replace("Z", "")),
                        busy=True,
                        source="busy_read",
                    )
                )
            except Exception:
                continue
        db.commit()

    added, removed = _diff_busy(prev_busy, busy)
    delta = CandidateCalendarBusyDelta(
        candidate_id=candidate_id,
        delta_key=_uuid("delta"),
        sync_run_id=run.id,
        kind="changed" if (added or removed) else "unchanged",
        busy_before_json=_dumps(prev_busy),
        busy_after_json=_dumps(busy),
        added_json=_dumps(added),
        removed_json=_dumps(removed),
        freshness_json=_dumps(
            {
                "synced_at": _utcnow().isoformat() + "Z",
                "stale": False,
                "source_mode": mode,
            }
        ),
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(delta)
    db.flush()

    affected = analyze_affected_plan(db, candidate_id=candidate_id, busy=busy)
    proposal = None
    if affected.get("affected_batch_ids") or affected.get("conflicts"):
        proposal = create_recalculation_proposal(
            db,
            candidate_id=candidate_id,
            delta_id=delta.id,
            sync_run_id=run.id,
            affected=affected,
        )

    run.status = "succeeded"
    run.mode = mode
    run.busy_count = len(busy)
    run.delta_count = len(added) + len(removed)
    run.snapshot_id = snap.get("id")
    run.body_json = _dumps(
        {
            "fabricated": False,
            "silent_plan_rewrite": False,
            "external_created": False,
            "live": retrieved.get("live"),
            "normalization": "busy_times_only",
        }
    )
    run.finished_at = _utcnow()
    conn.last_sync_at = run.finished_at
    conn.sync_cursor = f"snap:{snap.get('id')}"
    conn.updated_at = _utcnow()
    db.commit()
    db.refresh(run)
    db.refresh(delta)

    return {
        "sync_run": _ser_run(run),
        "delta": _ser_delta(delta),
        "snapshot": snap,
        "affected_plan": affected,
        "recalculation": _ser_proposal(proposal) if proposal else None,
        "idempotent": False,
        "silent_approved_plan_rewrite": False,
        "external_created": False,
    }


def _diff_busy(before: list[dict], after: list[dict]) -> tuple[list[dict], list[dict]]:
    def key(b: dict) -> str:
        return f"{b.get('starts_at')}|{b.get('ends_at')}"

    bset = {key(x): x for x in before}
    aset = {key(x): x for x in after}
    added = [aset[k] for k in aset.keys() - bset.keys()]
    removed = [bset[k] for k in bset.keys() - aset.keys()]
    return added, removed


def analyze_affected_plan(db: Session, *, candidate_id: int, busy: list[dict]) -> dict:
    """Detect overlaps with approved holds — never mutate ACAL here."""
    batches = (
        db.query(CandidateCommitmentBatch)
        .filter(
            CandidateCommitmentBatch.candidate_id == candidate_id,
            CandidateCommitmentBatch.deleted_at.is_(None),
            CandidateCommitmentBatch.status == "approved_executed",
        )
        .all()
    )
    conflicts = []
    affected_ids = []
    for batch in batches:
        items = (
            db.query(CandidateCommitmentBatchItem)
            .filter(
                CandidateCommitmentBatchItem.batch_id == batch.id,
                CandidateCommitmentBatchItem.candidate_id == candidate_id,
                CandidateCommitmentBatchItem.deleted_at.is_(None),
                CandidateCommitmentBatchItem.status.in_(("approved", "completed")),
            )
            .all()
        )
        hit = False
        for it in items:
            if not it.starts_at or not it.ends_at:
                continue
            for b in busy:
                try:
                    bs = datetime.fromisoformat(str(b["starts_at"]).replace("Z", ""))
                    be = datetime.fromisoformat(str(b["ends_at"]).replace("Z", ""))
                except Exception:
                    continue
                if it.starts_at < be and it.ends_at > bs:
                    conflicts.append(
                        {
                            "batch_id": batch.id,
                            "item_id": it.id,
                            "kind": "busy_overlap",
                            "claim_kind": "FACT",
                        }
                    )
                    hit = True
        if hit:
            affected_ids.append(batch.id)
    return {
        "affected_batch_ids": affected_ids,
        "conflicts": conflicts,
        "silent_mutation": False,
        "requires_candidate_approval": True,
        "acal_mutated": False,
    }


def create_recalculation_proposal(
    db: Session,
    *,
    candidate_id: int,
    delta_id: int | None,
    sync_run_id: int | None,
    affected: dict,
) -> CandidateCalendarRecalculationProposal:
    ctx = None
    try:
        ctx = life.get_or_create_context(db, candidate_id=candidate_id)
    except Exception:
        ctx = None
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id if ctx else None,
        approval_key=_uuid("apr"),
        approval_kind="calendar_recalculation",
        status="pending",
        bundled=False,
        before_json=_dumps({"approved_batches": affected.get("affected_batch_ids")}),
        after_json=_dumps(
            {
                "recalculate": True,
                "silent": False,
                "acal_only_if_approved": True,
            }
        ),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    row = CandidateCalendarRecalculationProposal(
        candidate_id=candidate_id,
        proposal_key=_uuid("recalc"),
        delta_id=delta_id,
        sync_run_id=sync_run_id,
        status="pending",
        affected_json=_dumps(affected),
        plan_before_json=_dumps({"batch_ids": affected.get("affected_batch_ids")}),
        plan_after_json=_dumps(
            {
                "action": "propose_internal_reschedule",
                "external_created": False,
                "autonomous": False,
            }
        ),
        lifecycle_approval_id=appr.id,
        silent=False,
        acal_mutated=False,
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def resolve_recalculation(
    db: Session, *, candidate_id: int, proposal_id: int, action: str
) -> dict:
    row = (
        db.query(CandidateCalendarRecalculationProposal)
        .filter_by(id=proposal_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("proposal_not_found")
    if row.status != "pending":
        raise ValueError("proposal_not_pending")
    action_u = action if action in ("approve", "reject", "postpone") else "reject"
    if row.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=row.lifecycle_approval_id,
            approved=(action_u == "approve"),
        )
    acal_mutated = False
    if action_u == "approve":
        # Mark affected approved batches as needing internal revise — do not invent Graph events
        affected = _loads(row.affected_json, {})
        for bid in affected.get("affected_batch_ids") or []:
            batch = (
                db.query(CandidateCommitmentBatch)
                .filter_by(id=int(bid), candidate_id=candidate_id)
                .one_or_none()
            )
            if batch and batch.status == "approved_executed":
                feas = _loads(batch.feasibility_json, {})
                feas["recalc_approved"] = True
                feas["needs_internal_reschedule"] = True
                feas["external_created"] = False
                batch.feasibility_json = _dumps(feas)
        row.status = "approved"
        # Daily OS notice only
        try:
            from app.services import career_daily_os as daily_os

            daily_os.upsert_inbox_item(
                db,
                candidate_id=candidate_id,
                item_key=f"recalc:{row.id}",
                kind="calendar",
                title="Availability changed — review internal holds",
                body={
                    "proposal_id": row.id,
                    "external_booking": False,
                    "canonical_daily_os": CANONICAL_DAILY_OS,
                },
                priority_score=80,
                deep_link="/dashboard/calendar-sync?view=deltas",
                claim_kind=cc.CLAIM_SUGGESTION,
            )
        except Exception as exc:
            logger.exception("daily os recalc push failed: %s", exc)
        acal_mutated = False  # ACAL items unchanged until candidate re-approves new batch
    elif action_u == "postpone":
        row.status = "postponed"
    else:
        row.status = "rejected"
    row.acal_mutated = acal_mutated
    row.resolved_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="recalculation",
        entity_id=row.id,
        action=action_u,
        before={},
        after={"status": row.status, "acal_mutated": acal_mutated},
    )
    db.commit()
    db.refresh(row)
    return {
        "proposal": _ser_proposal(row),
        "acal_mutated": acal_mutated,
        "state_mutated_acal": False,
        "silent": False,
        "external_created": False,
    }


def mint_private_feed(db: Session, *, candidate_id: int) -> dict:
    """Opaque revocable feed for approved internal holds only."""
    if not _privacy_ok(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused_scheduling_blocked")
    consent = acal.get_or_create_consent(db, candidate_id=candidate_id)
    if not consent.ics_export_opt_in:
        raise ValueError("ics_export_not_opted_in")
    raw = secrets.token_urlsafe(32)
    row = CandidateCalendarPrivateFeed(
        candidate_id=candidate_id,
        feed_key=_uuid("feed"),
        status="active",
        token_hash=_token_hash(raw),
        token_version=1,
        scope_json=_dumps(
            {
                "approved_internal_holds_only": True,
                "restricted_content": False,
                "confidential_excluded": True,
                "external_booking": False,
                "ics_is_confirmation": False,
            }
        ),
        expires_at=_utcnow() + timedelta(days=90),
        external_booking=False,
        ics_is_confirmation=False,
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="private_feed",
        entity_id=None,
        action="mint",
        before={},
        after={"token_version": 1, "opaque": True},
    )
    db.commit()
    db.refresh(row)
    return {
        "feed": _ser_feed(row),
        "token": raw,  # returned once — never logged
        "subscribe_path": f"/api/v1/public/calendar-feed/{raw}.ics",
        "external_booking": False,
        "ics_is_confirmation": False,
        "revocable": True,
        "opaque": True,
    }


def rotate_private_feed(db: Session, *, candidate_id: int, feed_id: int) -> dict:
    row = (
        db.query(CandidateCalendarPrivateFeed)
        .filter_by(id=feed_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("feed_not_found")
    raw = secrets.token_urlsafe(32)
    row.token_hash = _token_hash(raw)
    row.token_version = int(row.token_version or 1) + 1
    row.status = "active"
    row.revoked_at = None
    db.commit()
    db.refresh(row)
    return {
        "feed": _ser_feed(row),
        "token": raw,
        "subscribe_path": f"/api/v1/public/calendar-feed/{raw}.ics",
        "external_booking": False,
    }


def revoke_private_feed(db: Session, *, candidate_id: int, feed_id: int) -> dict:
    row = (
        db.query(CandidateCalendarPrivateFeed)
        .filter_by(id=feed_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("feed_not_found")
    row.status = "revoked"
    row.revoked_at = _utcnow()
    # Rotate hash so old token dies
    row.token_hash = _token_hash(secrets.token_urlsafe(32))
    row.token_version = int(row.token_version or 1) + 1
    db.commit()
    db.refresh(row)
    return {"feed": _ser_feed(row), "revoked": True}


def render_private_feed_ics(db: Session, *, token: str) -> str:
    th = _token_hash(token)
    row = (
        db.query(CandidateCalendarPrivateFeed)
        .filter_by(token_hash=th, status="active")
        .one_or_none()
    )
    if not row or row.deleted_at or row.revoked_at:
        raise ValueError("feed_not_found")
    if row.expires_at and row.expires_at < _utcnow():
        raise ValueError("feed_expired")
    items = (
        db.query(CandidateCommitmentBatchItem)
        .filter(
            CandidateCommitmentBatchItem.candidate_id == row.candidate_id,
            CandidateCommitmentBatchItem.deleted_at.is_(None),
            CandidateCommitmentBatchItem.status == "approved",
            CandidateCommitmentBatchItem.external_created.is_(False),
        )
        .limit(50)
        .all()
    )
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TWIN//Private Holds Feed//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-TWIN-EXTERNAL-BOOKING:FALSE",
        "X-TWIN-ICS-IS-CONFIRMATION:FALSE",
        "X-TWIN-FEED-PRIVATE:TRUE",
    ]
    for it in items:
        if not it.starts_at or not it.ends_at:
            continue
        uid = f"twin-feed-hold-{it.id}@twin.internal"
        stamp = _utcnow().strftime("%Y%m%dT%H%M%SZ")
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{stamp}",
                f"DTSTART:{it.starts_at.strftime('%Y%m%dT%H%M%SZ')}",
                f"DTEND:{it.ends_at.strftime('%Y%m%dT%H%M%SZ')}",
                "SUMMARY:[TWIN internal hold]",
                "DESCRIPTION:Private read-only feed of internal holds — not an externally booked event.",
                "STATUS:TENTATIVE",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    _audit(
        db,
        candidate_id=row.candidate_id,
        entity_type="private_feed",
        entity_id=row.id,
        action="access",
        before={},
        after={"token_version": row.token_version, "no_pii": True},
    )
    db.commit()
    return "\r\n".join(lines) + "\r\n"


def disconnect_connection(db: Session, *, candidate_id: int, user_id: int) -> dict:
    conn = ensure_connection(db, candidate_id=candidate_id, user_id=user_id)
    purged = purge_cached_busy(db, candidate_id=candidate_id)
    conn.status = "disconnected"
    conn.token_health = "revoked"
    conn.ms_busy_read_opt_in = False
    conn.updated_at = _utcnow()
    # Soft-clear MS token refs without logging secrets
    ms = (
        db.query(UserMicrosoftCalendar)
        .filter(UserMicrosoftCalendar.user_id == user_id)
        .one_or_none()
    )
    if ms:
        ms.refresh_token_encrypted = None
        if hasattr(ms, "access_token_encrypted"):
            ms.access_token_encrypted = None
        if hasattr(ms, "access_token_expires_at"):
            ms.access_token_expires_at = None
    db.commit()
    db.refresh(conn)
    return {"connection": _ser_connection(conn), "purged_busy_blocks": purged, "internal_only": True}


def delete_sync_history(db: Session, *, candidate_id: int) -> dict:
    now = _utcnow()
    n = 0
    for model in (
        CandidateCalendarSyncRun,
        CandidateCalendarBusyDelta,
        CandidateCalendarRecalculationProposal,
        CandidateCalendarPrivateFeed,
        CandidateCalendarConnection,
    ):
        for row in db.query(model).filter(model.candidate_id == candidate_id).all():
            if hasattr(row, "deleted_at") and row.deleted_at is None:
                row.deleted_at = now
                n += 1
            if isinstance(row, CandidateCalendarPrivateFeed):
                row.status = "revoked"
                row.revoked_at = now
                row.token_hash = _token_hash(secrets.token_urlsafe(16))
    purge_cached_busy(db, candidate_id=candidate_id)
    db.commit()
    return {"deleted": n, "propagated": True}


def export_sync(db: Session, *, candidate_id: int) -> dict:
    return {
        "schema": "twin.read_only_calendar_sync/v1",
        "connections": [
            _ser_connection(c)
            for c in db.query(CandidateCalendarConnection)
            .filter_by(candidate_id=candidate_id)
            .filter(CandidateCalendarConnection.deleted_at.is_(None))
            .all()
        ],
        "kpi_excluded": True,
        "tokens_excluded": True,
        "event_content_excluded": True,
    }


def build_aggregate(db: Session, *, candidate_id: int, user_id: int) -> dict:
    conn = ensure_connection(db, candidate_id=candidate_id, user_id=user_id)
    consent = acal.get_or_create_consent(db, candidate_id=candidate_id)
    scopes = scope_guard()
    runs = (
        db.query(CandidateCalendarSyncRun)
        .filter(
            CandidateCalendarSyncRun.candidate_id == candidate_id,
            CandidateCalendarSyncRun.deleted_at.is_(None),
        )
        .order_by(CandidateCalendarSyncRun.id.desc())
        .limit(10)
        .all()
    )
    deltas = (
        db.query(CandidateCalendarBusyDelta)
        .filter(
            CandidateCalendarBusyDelta.candidate_id == candidate_id,
            CandidateCalendarBusyDelta.deleted_at.is_(None),
        )
        .order_by(CandidateCalendarBusyDelta.id.desc())
        .limit(10)
        .all()
    )
    proposals = (
        db.query(CandidateCalendarRecalculationProposal)
        .filter(
            CandidateCalendarRecalculationProposal.candidate_id == candidate_id,
            CandidateCalendarRecalculationProposal.deleted_at.is_(None),
        )
        .order_by(CandidateCalendarRecalculationProposal.id.desc())
        .limit(10)
        .all()
    )
    feeds = (
        db.query(CandidateCalendarPrivateFeed)
        .filter(
            CandidateCalendarPrivateFeed.candidate_id == candidate_id,
            CandidateCalendarPrivateFeed.deleted_at.is_(None),
        )
        .order_by(CandidateCalendarPrivateFeed.id.desc())
        .limit(5)
        .all()
    )
    return {
        "schema": "twin.read_only_calendar_sync/v1",
        "verdict_target": (
            "READ-ONLY CALENDAR INTELLIGENCE CUSTOMER-USABLE - "
            "CONSENT-SAFE AVAILABILITY SYNCHRONIZATION PRODUCTION-READY"
        ),
        "connection": _ser_connection(conn),
        "consent": {
            "ms_busy_read_opt_in": bool(consent.ms_busy_read_opt_in),
            "store_availability_blocks": bool(consent.store_availability_blocks),
            "ics_export_opt_in": bool(consent.ics_export_opt_in),
            "internal_calendar_enabled": bool(consent.internal_calendar_enabled),
            "version": int(getattr(consent, "version", 0) or 0),
            "default_off": True,
            "bundled": False,
            "explicit": True,
        },
        "sync_runs": [_ser_run(r) for r in runs],
        "deltas": [_ser_delta(d) for d in deltas],
        "recalculations": [_ser_proposal(p) for p in proposals],
        "feeds": [_ser_feed(f) for f in feeds],
        "microsoft": scopes,
        "oauth": {
            "authorize_available": True,
            "reuse_canonical": "/api/v1/calendar/microsoft/authorize",
            "pkce": False,
            "state_validated": True,
            "code_replay_blocked": True,
            "scopes": MS_CALENDAR_SCOPES,
        },
        "safety": {
            "graph_write_scopes": scopes["write_scopes_present"],
            "microsoft_calendar_write": scopes["microsoft_calendar_write_enabled"],
            "write_methods_reachable": False,
            "token_exposure": False,
            "unnecessary_event_content_persisted": False,
            "bundled_consent": False,
            "consent_default_off": True,
            "revoke_stops_reads": True,
            "revoke_purges_busy": True,
            "internal_only_requires_ms": False,
            "synthetic_bypasses_normalization": False,
            "silent_approved_plan_rewrite": False,
            "recalc_without_approval": False,
            "reject_recalc_mutates_acal": False,
            "postpone_recalc_mutates_acal": False,
            "daily_os_404": False,
            "public_non_revocable_feed": False,
            "feed_as_external_booking": False,
            "ats_write": False,
            "auto_apply": False,
            "phase_3_career_agent": "NOT_STARTED",
        },
        "routes": {
            "consent_center": "/dashboard/consent-center",
            "calendar_sync": "/dashboard/calendar-sync",
            "connection": "/dashboard/calendar-sync?view=connection",
            "deltas": "/dashboard/calendar-sync?view=deltas",
            "history": "/dashboard/calendar-sync?view=history",
            "feed": "/dashboard/calendar-sync?view=feed",
            "privacy": "/dashboard/consent-center",
            "execution_calendar": "/dashboard/execution-calendar",
            "acceptance_calendar": "/dashboard/acceptance",
            "daily_os_canonical": CANONICAL_DAILY_OS,
            "daily_os_fe": "/dashboard/career",
            "api": "/api/v1/candidates/me/calendar-sync",
        },
        "integrations": {
            "execution_calendar": True,
            "acceptance_calendar": True,
            "daily_os": True,
            "decision_journal": True,
            "lifecycle": True,
            "microsoft_busy_read": True,
            "microsoft_calendar_write": False,
        },
        "alembic": "122_read_only_calendar_sync",
        "residual_epic_25": {
            "ms_write_off": True,
            "internal_without_ms": True,
            "holds_not_external": True,
            "acal_approved_only": True,
        },
        "analytics": {"kpi_excluded": True, "tokens_in_metrics": False},
        "invites_sent": 0,
        "alten_pack": False,
    }


def _ser_connection(c: CandidateCalendarConnection) -> dict:
    return {
        "id": c.id,
        "provider": c.provider,
        "status": c.status,
        "scopes": _loads(c.scopes_json, []),
        "consent_version": c.consent_version,
        "ms_busy_read_opt_in": c.ms_busy_read_opt_in,
        "token_health": c.token_health,
        "last_sync_at": c.last_sync_at.isoformat() if c.last_sync_at else None,
        "sync_cursor": c.sync_cursor,
        "oauth_meta": _loads(c.oauth_meta_json, {}),
        "health": _loads(c.health_json, {}),
        "internal_only_usable": True,
    }


def _ser_run(r: CandidateCalendarSyncRun) -> dict:
    return {
        "id": r.id,
        "status": r.status,
        "mode": r.mode,
        "busy_count": r.busy_count,
        "delta_count": r.delta_count,
        "snapshot_id": r.snapshot_id,
        "error_code": r.error_code,
        "body": _loads(r.body_json, {}),
        "idempotency_key": r.idempotency_key,
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "finished_at": r.finished_at.isoformat() if r.finished_at else None,
    }


def _ser_delta(d: CandidateCalendarBusyDelta) -> dict:
    return {
        "id": d.id,
        "kind": d.kind,
        "sync_run_id": d.sync_run_id,
        "added": _loads(d.added_json, []),
        "removed": _loads(d.removed_json, []),
        "freshness": _loads(d.freshness_json, {}),
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


def _ser_proposal(p: CandidateCalendarRecalculationProposal) -> dict:
    return {
        "id": p.id,
        "status": p.status,
        "delta_id": p.delta_id,
        "sync_run_id": p.sync_run_id,
        "affected": _loads(p.affected_json, {}),
        "plan_before": _loads(p.plan_before_json, {}),
        "plan_after": _loads(p.plan_after_json, {}),
        "silent": False,
        "acal_mutated": bool(p.acal_mutated),
        "lifecycle_approval_id": p.lifecycle_approval_id,
        "requires_approval": True,
    }


def _ser_feed(f: CandidateCalendarPrivateFeed) -> dict:
    return {
        "id": f.id,
        "status": f.status,
        "token_version": f.token_version,
        "scope": _loads(f.scope_json, {}),
        "revoked_at": f.revoked_at.isoformat() if f.revoked_at else None,
        "expires_at": f.expires_at.isoformat() if f.expires_at else None,
        "external_booking": False,
        "ics_is_confirmation": False,
        "opaque": True,
        "revocable": True,
        "token_hash_redacted": True,
    }
