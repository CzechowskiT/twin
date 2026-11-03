"""Company calendar holds — draft-first; provider write gated by MS write flag."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import CompanyCalendarConnection, CompanyCalendarHold
from app.services.platform_foundations import record_domain_event


def calendar_status(db: Session, *, company_slug: str) -> dict[str, Any]:
    slug = (company_slug or "").strip()[:80]
    rows = db.query(CompanyCalendarConnection).filter(CompanyCalendarConnection.company_slug == slug).all()
    settings = get_settings()
    return {
        "company_slug": slug,
        "connections": [
            {"provider": r.provider, "status": r.status, "scopes": r.scopes} for r in rows
        ],
        "microsoft_write_enabled": bool(settings.microsoft_calendar_write_enabled),
        "holds_mode": "draft_first",
        "provider_write": "LIVE" if settings.microsoft_calendar_write_enabled else "BLOCKED",
    }


def list_holds(db: Session, *, company_slug: str, limit: int = 50) -> dict[str, Any]:
    slug = (company_slug or "").strip()[:80]
    rows = (
        db.query(CompanyCalendarHold)
        .filter(CompanyCalendarHold.company_slug == slug)
        .order_by(CompanyCalendarHold.starts_at.asc())
        .limit(max(1, min(limit, 100)))
        .all()
    )
    return {
        "company_slug": slug,
        "holds": [
            {
                "id": r.id,
                "title": r.title,
                "starts_at": r.starts_at.isoformat() + "Z",
                "ends_at": r.ends_at.isoformat() + "Z",
                "provider": r.provider,
                "status": r.status,
                "provider_event_id": r.provider_event_id,
            }
            for r in rows
        ],
    }


def create_hold_draft(
    db: Session,
    *,
    company_slug: str,
    title: str,
    starts_at: datetime,
    ends_at: datetime,
    provider: str = "local",
) -> dict[str, Any]:
    slug = (company_slug or "").strip()[:80]
    if ends_at <= starts_at:
        raise ValueError("invalid_hold_range")
    settings = get_settings()
    status = "draft"
    provider_event_id = None
    # Provider write only when MS write kill-switch ON (controlled release).
    if provider == "microsoft" and settings.microsoft_calendar_write_enabled:
        status = "queued_provider"
    hold = CompanyCalendarHold(
        company_slug=slug,
        title=(title or "Interview hold").strip()[:200],
        starts_at=starts_at,
        ends_at=ends_at,
        provider=(provider or "local")[:32],
        status=status,
        provider_event_id=provider_event_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(hold)
    db.commit()
    db.refresh(hold)
    record_domain_event(
        db,
        event_name="company.calendar_hold_draft",
        aggregate_type="company_calendar_hold",
        aggregate_id=str(hold.id),
        payload={"company_slug": slug, "status": status, "provider": hold.provider},
    )
    return {
        "id": hold.id,
        "status": hold.status,
        "provider_write": status != "draft",
        "microsoft_write_enabled": bool(settings.microsoft_calendar_write_enabled),
    }


def ensure_connection_row(db: Session, *, company_slug: str, provider: str = "microsoft") -> dict[str, Any]:
    slug = (company_slug or "").strip()[:80]
    pid = (provider or "microsoft").strip().lower()[:32]
    row = (
        db.query(CompanyCalendarConnection)
        .filter(CompanyCalendarConnection.company_slug == slug, CompanyCalendarConnection.provider == pid)
        .one_or_none()
    )
    if row is None:
        row = CompanyCalendarConnection(
            company_slug=slug,
            provider=pid,
            status="pending_oauth",
            token_encrypted=None,
            scopes="Calendars.Read",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return {"company_slug": slug, "provider": pid, "status": row.status}
