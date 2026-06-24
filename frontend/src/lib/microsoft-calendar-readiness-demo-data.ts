/** Microsoft Graph busy-read readiness — deterministic demo records (preview only). */

import type {
  BlockedCalendarCapability,
  CalendarReadinessSource,
  OAuthConfigStatus,
} from "@/lib/calendar-readiness-demo-data";

export const MICROSOFT_CALENDAR_READINESS_DEMO_CANDIDATE_ID = "demo-candidate-001";

export const MICROSOFT_BUSY_READ_STAGE_ALLOWLIST = [
  "not_started",
  "oauth_env_preview",
  "busy_read_preview",
  "hold_write_blocked",
  "readiness_preview",
] as const;

export type MicrosoftBusyReadStage = (typeof MICROSOFT_BUSY_READ_STAGE_ALLOWLIST)[number];

export type MicrosoftBusyReadStatus = "preview_only" | "blocked" | "live_ready";

export type MicrosoftGraphWriteStatus = "blocked" | "preview_only";

export type MicrosoftCalendarReadinessRecord = {
  candidate_id: string;
  busy_read_stage: MicrosoftBusyReadStage;
  oauth_status: OAuthConfigStatus;
  busy_read: MicrosoftBusyReadStatus;
  event_write: MicrosoftGraphWriteStatus;
  public_health_flag: boolean;
  scopes_preview: readonly string[];
  blocked_capabilities: readonly BlockedCalendarCapability[];
  source: CalendarReadinessSource;
  headline: string;
};

const MICROSOFT_BLOCKED: BlockedCalendarCapability[] = [
  {
    id: "graph_write",
    label: "Microsoft Graph event write",
    reason: "Blocked — no calendar sync or event create/update/delete in busy-read readiness slice.",
  },
  {
    id: "invite_send",
    label: "Interview invite send",
    reason: "Blocked — busy-read preview only; no outbound invite claims.",
  },
  {
    id: "email_notify",
    label: "Calendar email notifications",
    reason: "Blocked — no email or notification claims.",
  },
  {
    id: "token_display",
    label: "OAuth token display",
    reason: "Blocked — no token surfaced in UI or docs.",
  },
];

export function getMicrosoftCalendarReadinessDemo(): MicrosoftCalendarReadinessRecord {
  return {
    candidate_id: MICROSOFT_CALENDAR_READINESS_DEMO_CANDIDATE_ID,
    busy_read_stage: "busy_read_preview",
    oauth_status: "partial",
    busy_read: "preview_only",
    event_write: "blocked",
    public_health_flag: false,
    scopes_preview: ["offline_access", "User.Read", "Calendars.Read"],
    blocked_capabilities: MICROSOFT_BLOCKED,
    source: "demo",
    headline:
      "Microsoft Graph busy-read readiness preview — OAuth env wiring check, no live sync or Graph writes.",
  };
}

export function isAllowedMicrosoftBusyReadStage(value: string): value is MicrosoftBusyReadStage {
  return (MICROSOFT_BUSY_READ_STAGE_ALLOWLIST as readonly string[]).includes(value);
}
