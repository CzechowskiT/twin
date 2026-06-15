"""Recruiter talent radar decisions — persist shortlist, snooze, dismiss; audit-only draft/review."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.database.models import Application, Job, RecruiterTalentRadarDecision
from app.services.recruiter_audit_trail import log_recruiter_audit_event
from app.utils.slug import slugify_company

DecisionAction = Literal[
    "shortlisted",
    "snoozed",
    "dismissed",
    "draft_prepared",
    "review_card_opened",
]

RADAR_DECISION_ACTION_TYPES = frozenset(
    {"shortlisted", "snoozed", "dismissed", "draft_prepared", "review_card_opened"}
)
RADAR_AUDIT_ONLY_ACTION_TYPES = frozenset({"draft_prepared", "review_card_opened"})
RADAR_SNOOZE_DAYS = frozenset({7, 30, 90})
RADAR_DISMISS_REASON_CODES = frozenset(
    {"wrong_role", "low_fit", "timing", "already_contacted", "other"}
)
RADAR_DECISION_FILTER_VALUES = frozenset({"active", "shortlisted", "snoozed", "dismissed"})

RADAR_AUDIT_ACTION_MAP = {
    "shortlisted": "radar_shortlisted",
    "snoozed": "radar_snoozed",
    "dismissed": "radar_dismissed",
    "draft_prepared": "radar_draft_prepared",
    "review_card_opened": "radar_review_card_opened",
}

ALLOWED_DECISION_META_KEYS = frozenset({"source", "snooze_days", "dismiss_reason_code"})
_FORBIDDEN_DECISION_META_KEYS = frozenset(
    {"decline_note", "note", "message", "body", "candidate_name", "email", "phone", "cv", "feedback"}
)


def _require_company_slug(company_slug: str) -> str:
    slug = slugify_company(company_slug.strip())
    if not slug or slug == "company":
        raise ValueError("company_slug is required.")
    return slug


def _sanitize_decision_meta(meta: dict[str, Any] | None) -> dict[str, str]:
    if not meta:
        return {}
    clean: dict[str, str] = {}
    for key, value in meta.items():
        if key in _FORBIDDEN_DECISION_META_KEYS or key not in ALLOWED_DECISION_META_KEYS or value is None:
            continue
        text = str(value).strip()
        if text:
            clean[key] = text[:256]
    return clean


def _application_for_company(db: Session, *, application_id: int, company_slug: str) -> Application:
    slug = _require_company_slug(company_slug)
    row = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.id == application_id)
        .first()
    )
    if not row:
        raise ValueError("Application not found.")
    app, job = row
    if slugify_company(job.company) != slug:
        raise ValueError("Application does not belong to this company.")
    return app


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_decision(row: RecruiterTalentRadarDecision) -> dict:
    meta: dict[str, str] = {}
    if row.meta_json:
        try:
            loaded = json.loads(row.meta_json)
            if isinstance(loaded, dict):
                meta = _sanitize_decision_meta(loaded)
        except json.JSONDecodeError:
            meta = {}
    snooze_until = row.snooze_until
    if snooze_until and snooze_until.tzinfo is None:
        snooze_until = snooze_until.replace(tzinfo=timezone.utc)
    return {
        "id": row.id,
        "application_id": row.application_id,
        "company_slug": row.company_slug,
        "action_type": row.action_type,
        "meta": meta,
        "snooze_until": snooze_until.isoformat() if snooze_until else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _effective_decision_state(decision: dict | None, *, now: datetime | None = None) -> str | None:
    """Return filter bucket for latest decision: shortlisted, snoozed, dismissed, or None (active)."""
    if not decision:
        return None
    action = decision.get("action_type")
    if action == "shortlisted":
        return "shortlisted"
    if action == "dismissed":
        return "dismissed"
    if action == "snoozed":
        until_raw = decision.get("snooze_until")
        if until_raw:
            until = datetime.fromisoformat(until_raw.replace("Z", "+00:00"))
            if until.tzinfo is None:
                until = until.replace(tzinfo=timezone.utc)
            if until > (now or _utc_now()):
                return "snoozed"
        return None
    return None


def log_recruiter_talent_radar_decision(
    db: Session,
    *,
    application_id: int,
    company_slug: str,
    action_type: str,
    meta: dict[str, Any] | None = None,
    snooze_days: int | None = None,
    dismiss_reason_code: str | None = None,
) -> dict:
    act = action_type.strip()
    if act not in RADAR_DECISION_ACTION_TYPES:
        raise ValueError("Unsupported decision action_type.")
    slug = _require_company_slug(company_slug)
    _application_for_company(db, application_id=application_id, company_slug=slug)

    clean_meta = _sanitize_decision_meta(meta or {})
    snooze_until: datetime | None = None

    if act == "snoozed":
        if snooze_days not in RADAR_SNOOZE_DAYS:
            raise ValueError("snooze_days must be 7, 30, or 90.")
        clean_meta["snooze_days"] = str(snooze_days)
        snooze_until = _utc_now() + timedelta(days=snooze_days)
    elif act == "dismissed":
        code = (dismiss_reason_code or "").strip()
        if code not in RADAR_DISMISS_REASON_CODES:
            raise ValueError("dismiss_reason_code is required.")
        clean_meta["dismiss_reason_code"] = code
    elif snooze_days is not None or dismiss_reason_code:
        raise ValueError("snooze_days and dismiss_reason_code only apply to snoozed/dismissed.")

    if "source" not in clean_meta:
        clean_meta["source"] = "talent_radar"

    row = RecruiterTalentRadarDecision(
        application_id=application_id,
        company_slug=slug,
        action_type=act,
        meta_json=json.dumps(clean_meta) if clean_meta else None,
        snooze_until=snooze_until,
        created_at=_utc_now(),
    )
    db.add(row)
    db.flush()

    audit_action = RADAR_AUDIT_ACTION_MAP[act]
    audit_meta: dict[str, str] = {"source": clean_meta.get("source", "talent_radar")}
    if act == "snoozed" and snooze_days is not None:
        audit_meta["snooze_days"] = str(snooze_days)
    if act == "dismissed" and dismiss_reason_code:
        audit_meta["dismiss_reason_code"] = dismiss_reason_code

    log_recruiter_audit_event(
        db,
        application_id=application_id,
        company_slug=slug,
        action_type=audit_action,
        meta=audit_meta,
    )

    db.commit()
    db.refresh(row)
    serialized = _serialize_decision(row)
    serialized["decision_state"] = _effective_decision_state(serialized) or "active"
    return serialized


def list_recruiter_talent_radar_decisions(
    db: Session,
    *,
    company_slug: str,
    application_id: int | None = None,
    decision_filter: str | None = None,
    limit: int = 100,
) -> dict:
    slug = _require_company_slug(company_slug)
    filt = (decision_filter or "").strip().lower() or None
    if filt and filt not in RADAR_DECISION_FILTER_VALUES:
        raise ValueError("Unsupported decision_filter.")

    cap = max(1, min(limit, 200))
    q = db.query(RecruiterTalentRadarDecision).filter(
        RecruiterTalentRadarDecision.company_slug == slug,
    )
    if application_id is not None:
        _application_for_company(db, application_id=application_id, company_slug=slug)
        q = q.filter(RecruiterTalentRadarDecision.application_id == application_id)

    rows = q.order_by(RecruiterTalentRadarDecision.created_at.desc()).limit(cap * 5).all()

    latest_by_app: dict[int, dict] = {}
    for row in rows:
        app_id = row.application_id
        if app_id not in latest_by_app:
            latest_by_app[app_id] = _serialize_decision(row)

    items: list[dict] = []
    now = _utc_now()
    for app_id, decision in latest_by_app.items():
        state = _effective_decision_state(decision, now=now)
        if filt == "active" and state is not None:
            continue
        if filt == "shortlisted" and state != "shortlisted":
            continue
        if filt == "snoozed" and state != "snoozed":
            continue
        if filt == "dismissed" and state != "dismissed":
            continue
        items.append({**decision, "decision_state": state or "active"})
        if len(items) >= cap:
            break

    return {
        "company_slug": slug,
        "decision_filter": filt or "all",
        "items": items,
    }


def latest_decisions_by_application(
    db: Session,
    *,
    company_slug: str,
    application_ids: list[int],
) -> dict[int, dict]:
    """Return latest decision per application_id for radar enrichment."""
    if not application_ids:
        return {}
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(RecruiterTalentRadarDecision)
        .filter(
            RecruiterTalentRadarDecision.company_slug == slug,
            RecruiterTalentRadarDecision.application_id.in_(application_ids),
        )
        .order_by(RecruiterTalentRadarDecision.created_at.desc())
        .all()
    )
    out: dict[int, dict] = {}
    now = _utc_now()
    for row in rows:
        app_id = row.application_id
        if app_id in out:
            continue
        serialized = _serialize_decision(row)
        state = _effective_decision_state(serialized, now=now)
        out[app_id] = {
            **serialized,
            "decision_state": state or "active",
        }
    return out
