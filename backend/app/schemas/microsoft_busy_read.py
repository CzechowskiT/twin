"""Microsoft Graph busy-read capability contract — read-only, no tokens."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

MicrosoftOAuthConnectionState = Literal[
    "not_connected",
    "connect_available",
    "read_only_connected_demo",
    "read_only_connected_live",
    "blocked",
]

MicrosoftBusyReadCapabilityStatus = Literal[
    "not_enabled",
    "ready_for_oauth",
    "read_only_probe_ready",
    "demo_busy_slots_available",
    "live_busy_slots_available",
    "blocked",
]

BusyReadSource = Literal["demo", "live", "partial"]

BusySlotStatus = Literal["busy", "tentative", "unavailable", "unknown"]

BusySlotSource = Literal["demo", "live_read_only", "partial"]

PreviewMode = Literal["demo", "not_connected", "live_read_only", "partial"]


class MicrosoftBusyReadBlockedCapabilityOut(BaseModel):
    id: str
    label: str
    reason: str


class MicrosoftBusyReadReadinessOut(BaseModel):
    provider: Literal["microsoft"] = "microsoft"
    capability: Literal["busy_read"] = "busy_read"
    oauth_connection_state: MicrosoftOAuthConnectionState
    required_scopes: list[str]
    forbidden_scopes: list[str]
    busy_read_status: MicrosoftBusyReadCapabilityStatus
    blocked_capabilities: list[MicrosoftBusyReadBlockedCapabilityOut]
    public_health_microsoft_configured: bool = Field(
        description="True when Microsoft Calendar OAuth client id, secret, and redirect URI are configured.",
    )
    product_gate_enabled: bool = Field(
        False,
        description="True when MICROSOFT_BUSY_READ_ENABLED is set on the API.",
    )
    oauth_connect_gate_enabled: bool = Field(
        False,
        description="True when MICROSOFT_OAUTH_CONNECT_GATE_ENABLED is set on the API.",
    )
    calendar_write_gate_enabled: bool = Field(
        False,
        description="True when MICROSOFT_CALENDAR_WRITE_ENABLED is set on the API (legacy interview write).",
    )
    source: BusyReadSource
    headline: str


class MicrosoftBusySlotPreviewOut(BaseModel):
    start: str
    end: str
    status: BusySlotStatus
    source: BusySlotSource
    event_subject_redacted: Literal[True] = True


class MicrosoftBusyReadPreviewOut(BaseModel):
    provider: Literal["microsoft"] = "microsoft"
    capability: Literal["busy_read"] = "busy_read"
    preview_mode: PreviewMode
    busy_slot_preview: list[MicrosoftBusySlotPreviewOut]
    source: BusyReadSource
    headline: str
    live_graph_stub: bool = Field(
        False,
        description="True when live Graph read is intentionally stubbed (unsafe token scope or upstream error).",
    )
    product_gate_enabled: bool = Field(
        False,
        description="True when MICROSOFT_BUSY_READ_ENABLED is set on the API.",
    )
    oauth_connect_gate_enabled: bool = Field(
        False,
        description="True when MICROSOFT_OAUTH_CONNECT_GATE_ENABLED is set on the API.",
    )
    calendar_write_gate_enabled: bool = Field(
        False,
        description="True when MICROSOFT_CALENDAR_WRITE_ENABLED is set on the API (legacy interview write).",
    )
    public_health_microsoft_configured: bool = Field(
        False,
        description="True when Microsoft Calendar OAuth client id, secret, and redirect URI are configured.",
    )
