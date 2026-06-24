/** Microsoft Graph busy-read capability contract — deterministic demo (read-only). */

import type { CalendarReadinessSource } from "@/lib/calendar-readiness-demo-data";

export const MICROSOFT_BUSY_READ_DEMO_CANDIDATE_ID = "demo-candidate-001";

export const MICROSOFT_BUSY_READ_REQUIRED_SCOPES = [
  "offline_access",
  "User.Read",
  "Calendars.Read",
] as const;

export const MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES = [
  "Calendars.ReadWrite",
  "Mail.Send",
  "OnlineMeetings.ReadWrite",
] as const;

export const MICROSOFT_OAUTH_CONNECTION_STATE_ALLOWLIST = [
  "not_connected",
  "connect_available",
  "read_only_connected_demo",
  "read_only_connected_live",
  "blocked",
] as const;

export type MicrosoftOAuthConnectionState =
  (typeof MICROSOFT_OAUTH_CONNECTION_STATE_ALLOWLIST)[number];

export const MICROSOFT_BUSY_READ_STATUS_ALLOWLIST = [
  "not_enabled",
  "ready_for_oauth",
  "read_only_probe_ready",
  "demo_busy_slots_available",
  "live_busy_slots_available",
  "blocked",
] as const;

export type MicrosoftBusyReadCapabilityStatus =
  (typeof MICROSOFT_BUSY_READ_STATUS_ALLOWLIST)[number];

export const BUSY_SLOT_STATUS_ALLOWLIST = [
  "busy",
  "tentative",
  "unavailable",
  "unknown",
] as const;

export type BusySlotStatus = (typeof BUSY_SLOT_STATUS_ALLOWLIST)[number];

export const BUSY_SLOT_SOURCE_ALLOWLIST = ["demo", "live_read_only", "partial"] as const;

export type BusySlotSource = (typeof BUSY_SLOT_SOURCE_ALLOWLIST)[number];

export type MicrosoftBusySlotPreview = {
  start: string;
  end: string;
  status: BusySlotStatus;
  source: BusySlotSource;
  event_subject_redacted: true;
};

export type MicrosoftBusyReadBlockedCapability = {
  id: string;
  label: string;
  reason: string;
};

export type MicrosoftBusyReadCapabilityRecord = {
  provider: "microsoft";
  capability: "busy_read";
  candidate_id: string;
  oauth_connection_state: MicrosoftOAuthConnectionState;
  required_scopes: readonly string[];
  forbidden_scopes: readonly string[];
  busy_read_status: MicrosoftBusyReadCapabilityStatus;
  busy_slot_preview: readonly MicrosoftBusySlotPreview[];
  blocked_capabilities: readonly MicrosoftBusyReadBlockedCapability[];
  public_health_microsoft_configured: boolean;
  source: CalendarReadinessSource;
  headline: string;
};

const BLOCKED: MicrosoftBusyReadBlockedCapability[] = [
  {
    id: "no_event_write",
    label: "No calendar event write",
    reason: "External write blocked — Calendars.Read only, no Graph write scopes.",
  },
  {
    id: "no_event_create",
    label: "No event create",
    reason: "No calendar event write — product gate required for any write path.",
  },
  {
    id: "no_event_update",
    label: "No event update",
    reason: "No calendar event write — read-only busy availability preview.",
  },
  {
    id: "no_event_delete",
    label: "No event delete",
    reason: "No calendar event write — human review required before any external action.",
  },
  {
    id: "no_invite_sent",
    label: "No outbound invite",
    reason: "Outbound invite blocked — read-only busy availability, no meeting creation.",
  },
  {
    id: "no_meeting_creation",
    label: "No meeting creation",
    reason: "No meeting creation — busy-read preview only.",
  },
  {
    id: "no_email_sent",
    label: "No email dispatch",
    reason: "Email dispatch blocked — no notification claims in this milestone.",
  },
  {
    id: "no_notification_sent",
    label: "No notification dispatch",
    reason: "Notification dispatch blocked — external write blocked.",
  },
  {
    id: "no_ats_writeback",
    label: "No ATS writeback",
    reason: "No ATS writeback — calendar busy-read is isolated from ATS sync.",
  },
];

const DEMO_SLOTS: MicrosoftBusySlotPreview[] = [
  {
    start: "2026-06-24T09:00:00+02:00",
    end: "2026-06-24T10:30:00+02:00",
    status: "busy",
    source: "demo",
    event_subject_redacted: true,
  },
  {
    start: "2026-06-24T13:00:00+02:00",
    end: "2026-06-24T14:00:00+02:00",
    status: "tentative",
    source: "demo",
    event_subject_redacted: true,
  },
  {
    start: "2026-06-24T16:00:00+02:00",
    end: "2026-06-24T17:00:00+02:00",
    status: "unavailable",
    source: "demo",
    event_subject_redacted: true,
  },
];

export function getMicrosoftBusyReadDemo(): MicrosoftBusyReadCapabilityRecord {
  return {
    provider: "microsoft",
    capability: "busy_read",
    candidate_id: MICROSOFT_BUSY_READ_DEMO_CANDIDATE_ID,
    oauth_connection_state: "connect_available",
    required_scopes: MICROSOFT_BUSY_READ_REQUIRED_SCOPES,
    forbidden_scopes: MICROSOFT_BUSY_READ_FORBIDDEN_SCOPES,
    busy_read_status: "demo_busy_slots_available",
    busy_slot_preview: DEMO_SLOTS,
    blocked_capabilities: BLOCKED,
    public_health_microsoft_configured: false,
    source: "demo",
    headline:
      "Read-only busy availability preview — Calendars.Read only, event details redacted, no calendar sync.",
  };
}

export function isAllowedMicrosoftOAuthConnectionState(
  value: string,
): value is MicrosoftOAuthConnectionState {
  return (MICROSOFT_OAUTH_CONNECTION_STATE_ALLOWLIST as readonly string[]).includes(value);
}

export function isAllowedMicrosoftBusyReadCapabilityStatus(
  value: string,
): value is MicrosoftBusyReadCapabilityStatus {
  return (MICROSOFT_BUSY_READ_STATUS_ALLOWLIST as readonly string[]).includes(value);
}

export function allBusySlotsRedacted(slots: readonly MicrosoftBusySlotPreview[]): boolean {
  return slots.every((slot) => slot.event_subject_redacted === true);
}
