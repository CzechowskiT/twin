"""Microsoft Graph busy-read — read-only readiness contract and slot preview (no tokens)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import Settings
from app.schemas.microsoft_busy_read import (
    MicrosoftBusyReadBlockedCapabilityOut,
    MicrosoftBusyReadReadinessOut,
)
from app.services.calendar_provider_health import probe_microsoft_calendar_health
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


def _oauth_configured_flag() -> bool:
    return is_microsoft_calendar_oauth_configured()


def build_microsoft_busy_read_readiness(
    db: Session,
    user_id: int,
    settings: Settings,
) -> MicrosoftBusyReadReadinessOut:
    """Honest readiness contract — product gates default off; no token fields."""
    oauth_configured = _oauth_configured_flag()
    gate_enabled = bool(getattr(settings, "microsoft_busy_read_enabled", False))

    if not gate_enabled:
        return MicrosoftBusyReadReadinessOut(
            oauth_connection_state="connect_available",
            required_scopes=list(REQUIRED_SCOPES),
            forbidden_scopes=list(FORBIDDEN_SCOPES),
            busy_read_status="demo_busy_slots_available",
            blocked_capabilities=list(_BLOCKED_CAPABILITIES),
            public_health_microsoft_configured=oauth_configured,
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
    elif oauth_configured:
        oauth_state = "connect_available"
        busy_status = "ready_for_oauth"
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
        source=source,
        headline=_READINESS_HEADLINE,
    )
