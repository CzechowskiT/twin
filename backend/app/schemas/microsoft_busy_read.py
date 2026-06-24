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
    source: BusyReadSource
    headline: str
