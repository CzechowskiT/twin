"""Microsoft Graph busy-read — read-only readiness contract and slot preview (no tokens)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import Settings
from app.schemas.microsoft_busy_read import (
    MicrosoftBusyReadBlockedCapabilityOut,
    MicrosoftBusyReadPreviewOut,
    MicrosoftBusyReadReadinessOut,
    MicrosoftBusySlotPreviewOut,
)
from app.services.calendar_oauth_credentials import (
    CalendarTokenResolutionError,
    get_best_microsoft_row,
    resolve_microsoft_access_token,
)
from app.services.calendar_provider_health import probe_microsoft_calendar_health
from app.services.microsoft_calendar_api import (
    MicrosoftCalendarApiError,
    query_schedule,
    schedule_items_to_busy_blocks,
)
from app.services.microsoft_calendar_oauth import is_microsoft_calendar_oauth_configured

REQUIRED_SCOPES: tuple[str, ...] = ("offline_access", "User.Read", "Calendars.Read")
FORBIDDEN_SCOPES: tuple[str, ...] = (
    "Calendars.ReadWrite",
    "Mail.Send",
    "OnlineMeetings.ReadWrite",
)

_BLOCKED_CAPABILITIES: tuple[MicrosoftBusyReadBlockedCapabilityOut, ...] = (
    MicrosoftBusyReadBlockedCapabilityOut(
        id="no_event_write",
        label="No calendar event write",
        reason="External write blocked — Calendars.Read only, no Graph write scopes.",
    ),
    MicrosoftBusyReadBlockedCapabilityOut(
        id="no_event_create",
        label="No event create",
        reason="No calendar event write — product gate required for any write path.",
    ),
    MicrosoftBusyReadBlockedCapabilityOut(
        id="no_event_update",
        label="No event update",
        reason="No calendar event write — read-only busy availability preview.",
    ),
    MicrosoftBusyReadBlockedCapabilityOut(
        id="no_event_delete",
        label="No event delete",
        reason="No calendar event write — human review required before any external action.",
    ),
    MicrosoftBusyReadBlockedCapabilityOut(
        id="no_invite_sent",
        label="No outbound invite",
        reason="Outbound invite blocked — read-only busy availability, no meeting creation.",
    ),
    MicrosoftBusyReadBlockedCapabilityOut(
        id="no_meeting_creation",
        label="No meeting creation",
        reason="No meeting creation — busy-read preview only.",
    ),
    MicrosoftBusyReadBlockedCapabilityOut(
        id="no_email_sent",
        label="No email dispatch",
        reason="Email dispatch blocked — no notification claims in this milestone.",
    ),
    MicrosoftBusyReadBlockedCapabilityOut(
        id="no_notification_sent",
        label="No notification dispatch",
        reason="Notification dispatch blocked — external write blocked.",
    ),
    MicrosoftBusyReadBlockedCapabilityOut(
        id="no_ats_writeback",
        label="No ATS writeback",
        reason="No ATS writeback — calendar busy-read is isolated from ATS sync.",
    ),
)

_READINESS_HEADLINE = (
    "Read-only busy availability preview — Calendars.Read only, event details redacted, no calendar sync."
)

_DEMO_SLOTS: tuple[MicrosoftBusySlotPreviewOut, ...] = (
    MicrosoftBusySlotPreviewOut(
        start="2026-06-24T09:00:00+02:00",
        end="2026-06-24T10:30:00+02:00",
        status="busy",
        source="demo",
    ),
    MicrosoftBusySlotPreviewOut(
        start="2026-06-24T13:00:00+02:00",
        end="2026-06-24T14:00:00+02:00",
        status="tentative",
        source="demo",
    ),
    MicrosoftBusySlotPreviewOut(
        start="2026-06-24T16:00:00+02:00",
        end="2026-06-24T17:00:00+02:00",
        status="unavailable",
        source="demo",
    ),
)


def _oauth_configured_flag() -> bool:
    return is_microsoft_calendar_oauth_configured()


def _safety_flags(settings: Settings) -> dict[str, bool]:
    return {
        "product_gate_enabled": settings.microsoft_busy_read_enabled,
        "oauth_connect_gate_enabled": settings.microsoft_oauth_connect_gate_enabled,
        "calendar_write_gate_enabled": settings.microsoft_calendar_write_enabled,
    }


def build_microsoft_busy_read_readiness(
    db: Session,
    user_id: int,
    settings: Settings,
) -> MicrosoftBusyReadReadinessOut:
    """Honest readiness contract — product gates default off; no token fields."""
    oauth_configured = _oauth_configured_flag()
    gate_enabled = settings.microsoft_busy_read_enabled
    oauth_gate_enabled = settings.microsoft_oauth_connect_gate_enabled
    safety = _safety_flags(settings)

    if not gate_enabled:
        return MicrosoftBusyReadReadinessOut(
            oauth_connection_state="connect_available",
            required_scopes=list(REQUIRED_SCOPES),
            forbidden_scopes=list(FORBIDDEN_SCOPES),
            busy_read_status="demo_busy_slots_available",
            blocked_capabilities=list(_BLOCKED_CAPABILITIES),
            public_health_microsoft_configured=oauth_configured,
            **safety,
            source="demo",
            headline=_READINESS_HEADLINE,
        )

    probe = probe_microsoft_calendar_health(db, user_id)
    if probe.health == "ok" and probe.connected:
        oauth_state = "read_only_connected_live"
        busy_status = "live_busy_slots_available"
        source = "live"
    elif probe.connected:
        oauth_state = "read_only_connected_demo"
        busy_status = "demo_busy_slots_available"
        source = "partial"
    elif oauth_configured and oauth_gate_enabled:
        oauth_state = "connect_available"
        busy_status = "ready_for_oauth"
        source = "partial"
    elif oauth_configured:
        oauth_state = "connect_available"
        busy_status = "demo_busy_slots_available"
        source = "partial"
    else:
        oauth_state = "not_connected"
        busy_status = "not_enabled"
        source = "demo"

    return MicrosoftBusyReadReadinessOut(
        oauth_connection_state=oauth_state,
        required_scopes=list(REQUIRED_SCOPES),
        forbidden_scopes=list(FORBIDDEN_SCOPES),
        busy_read_status=busy_status,
        blocked_capabilities=list(_BLOCKED_CAPABILITIES),
        public_health_microsoft_configured=oauth_configured,
        **safety,
        source=source,
        headline=_READINESS_HEADLINE,
    )


def _live_busy_slots_from_graph(db: Session, user_id: int) -> tuple[list[MicrosoftBusySlotPreviewOut], bool]:
    """Read-only getSchedule — returns (slots, live_graph_stub). Stub when token unsafe."""
    row = get_best_microsoft_row(db, user_id)
    if not row:
        return [], True
    try:
        access = resolve_microsoft_access_token(db, row).token
    except CalendarTokenResolutionError:
        return [], True

    now = datetime.now(timezone.utc)
    time_min = now.isoformat().replace("+00:00", "Z")
    time_max = (now + timedelta(days=7)).isoformat().replace("+00:00", "Z")
    try:
        raw = query_schedule(access, time_min, time_max, time_zone="UTC")
        blocks = schedule_items_to_busy_blocks(raw)
    except MicrosoftCalendarApiError:
        return [], True

    slots: list[MicrosoftBusySlotPreviewOut] = []
    for block in blocks[:10]:
        start = block.get("start")
        end = block.get("end")
        if not start or not end:
            continue
        slots.append(
            MicrosoftBusySlotPreviewOut(
                start=str(start),
                end=str(end),
                status="busy",
                source="live_read_only",
            )
        )
    return slots, False


def build_microsoft_busy_read_preview(
    db: Session,
    user_id: int,
    settings: Settings,
) -> MicrosoftBusyReadPreviewOut:
    """Redacted busy slot preview — demo / not_connected / live_read_only / partial."""
    oauth_configured = _oauth_configured_flag()
    safety = _safety_flags(settings)
    base_flags = {
        **safety,
        "public_health_microsoft_configured": oauth_configured,
        "headline": _READINESS_HEADLINE,
    }

    if not settings.microsoft_busy_read_enabled:
        return MicrosoftBusyReadPreviewOut(
            preview_mode="demo",
            busy_slot_preview=list(_DEMO_SLOTS),
            source="demo",
            live_graph_stub=False,
            **base_flags,
        )

    probe = probe_microsoft_calendar_health(db, user_id)
    if not probe.connected:
        return MicrosoftBusyReadPreviewOut(
            preview_mode="not_connected",
            busy_slot_preview=[],
            source="demo",
            live_graph_stub=False,
            **base_flags,
        )

    live_slots, stubbed = _live_busy_slots_from_graph(db, user_id)
    if live_slots and not stubbed:
        return MicrosoftBusyReadPreviewOut(
            preview_mode="live_read_only",
            busy_slot_preview=live_slots,
            source="live",
            live_graph_stub=False,
            **base_flags,
        )

    if live_slots and stubbed:
        return MicrosoftBusyReadPreviewOut(
            preview_mode="partial",
            busy_slot_preview=live_slots,
            source="partial",
            live_graph_stub=True,
            **base_flags,
        )

    return MicrosoftBusyReadPreviewOut(
        preview_mode="partial",
        busy_slot_preview=list(_DEMO_SLOTS),
        source="partial",
        live_graph_stub=True,
        **base_flags,
    )
