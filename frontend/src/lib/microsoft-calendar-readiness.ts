/** Microsoft Graph busy-read readiness domain — merges with shared calendar-readiness. */

import {
  CALENDAR_READINESS_DEMO_CANDIDATE_ID,
  mergePublicHealthCalendarFlags,
  resolveCalendarReadiness,
  type CalendarReadinessRecord,
} from "@/lib/calendar-readiness";
import {
  getMicrosoftCalendarReadinessDemo,
  isAllowedMicrosoftBusyReadStage,
  MICROSOFT_BUSY_READ_STAGE_ALLOWLIST,
  MICROSOFT_CALENDAR_READINESS_DEMO_CANDIDATE_ID,
  type MicrosoftBusyReadStage,
  type MicrosoftCalendarReadinessRecord,
} from "@/lib/microsoft-calendar-readiness-demo-data";
import type { TranslationKey } from "@/lib/i18n";

export {
  getMicrosoftCalendarReadinessDemo,
  isAllowedMicrosoftBusyReadStage,
  MICROSOFT_BUSY_READ_STAGE_ALLOWLIST,
  MICROSOFT_CALENDAR_READINESS_DEMO_CANDIDATE_ID,
};
export type { MicrosoftBusyReadStage, MicrosoftCalendarReadinessRecord };

export const MICROSOFT_CALENDAR_READINESS_MARKERS = {
  busyRead: "microsoft-calendar-readiness-busy-read",
  oauthStatus: "microsoft-calendar-readiness-oauth-status",
  scopes: "microsoft-calendar-readiness-scopes",
  publicHealth: "microsoft-calendar-readiness-public-health",
  blocked: "microsoft-calendar-readiness-blocked",
} as const;

export const MICROSOFT_BUSY_READ_STAGE_KEYS: Record<MicrosoftBusyReadStage, TranslationKey> = {
  not_started: "microsoftCalendarReadiness.stageNotStarted",
  oauth_env_preview: "microsoftCalendarReadiness.stageOauthEnvPreview",
  busy_read_preview: "microsoftCalendarReadiness.stageBusyReadPreview",
  hold_write_blocked: "microsoftCalendarReadiness.stageHoldWriteBlocked",
  readiness_preview: "microsoftCalendarReadiness.stageReadinessPreview",
};

export function microsoftBusyReadStageKey(stage: MicrosoftBusyReadStage): TranslationKey {
  return MICROSOFT_BUSY_READ_STAGE_KEYS[stage];
}

export function microsoftGraphWriteBlocked(record: MicrosoftCalendarReadinessRecord): boolean {
  return record.event_write === "blocked";
}

export function microsoftBusyReadPreviewOnly(record: MicrosoftCalendarReadinessRecord): boolean {
  return record.busy_read === "preview_only";
}

function fromCalendarRecord(record: CalendarReadinessRecord): MicrosoftCalendarReadinessRecord {
  const ms = record.providers.find((row) => row.provider === "microsoft");
  return {
    candidate_id: record.candidate_id,
    busy_read_stage: record.readiness_stage as MicrosoftBusyReadStage,
    oauth_status: ms?.oauth_status ?? "not_configured",
    busy_read: ms?.busy_read ?? "blocked",
    event_write: ms?.event_write ?? "blocked",
    public_health_flag: record.public_health.microsoft_calendar_configured,
    scopes_preview: ["offline_access", "User.Read", "Calendars.Read"],
    blocked_capabilities: record.blocked_capabilities.filter((cap) =>
      ["graph_write", "invite_send", "email_notify", "token_display"].includes(cap.id),
    ),
    source: record.source,
    headline: record.headline,
  };
}

export function resolveMicrosoftCalendarReadiness(
  candidateId?: string,
): MicrosoftCalendarReadinessRecord | null {
  const trimmed = (candidateId ?? MICROSOFT_CALENDAR_READINESS_DEMO_CANDIDATE_ID).trim();
  if (!trimmed) return null;
  if (trimmed === MICROSOFT_CALENDAR_READINESS_DEMO_CANDIDATE_ID) {
    const base = resolveCalendarReadiness(CALENDAR_READINESS_DEMO_CANDIDATE_ID);
    return base ? fromCalendarRecord(base) : getMicrosoftCalendarReadinessDemo();
  }
  return null;
}

export function mergeMicrosoftPublicHealthFlag(
  record: MicrosoftCalendarReadinessRecord,
  configured: boolean,
): MicrosoftCalendarReadinessRecord {
  return {
    ...record,
    public_health_flag: configured,
    source: configured !== record.public_health_flag ? "partial" : record.source,
  };
}

export function deriveMicrosoftFromCalendar(
  record: CalendarReadinessRecord,
): MicrosoftCalendarReadinessRecord {
  return fromCalendarRecord(mergePublicHealthCalendarFlags(record, {}));
}
