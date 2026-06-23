/** Calendar OAuth readiness domain — shared types, demo resolver, source badge. */

import {
  getCalendarReadinessDemo,
  isAllowedCalendarProvider,
  isAllowedCalendarReadinessStage,
  isAllowedOAuthConfigStatus,
  CALENDAR_PROVIDER_ALLOWLIST,
  CALENDAR_READINESS_DEMO_CANDIDATE_ID,
  CALENDAR_READINESS_STAGE_ALLOWLIST,
  OAUTH_CONFIG_STATUS_ALLOWLIST,
  type CalendarReadinessRecord,
  type CalendarReadinessSource,
  type PublicHealthCalendarFlags,
} from "@/lib/calendar-readiness-demo-data";
import type { TranslationKey } from "@/lib/i18n";

export {
  getCalendarReadinessDemo,
  isAllowedCalendarProvider,
  isAllowedCalendarReadinessStage,
  isAllowedOAuthConfigStatus,
  CALENDAR_PROVIDER_ALLOWLIST,
  CALENDAR_READINESS_STAGE_ALLOWLIST,
  OAUTH_CONFIG_STATUS_ALLOWLIST,
  CALENDAR_READINESS_DEMO_CANDIDATE_ID,
};
export type { CalendarReadinessRecord, CalendarReadinessSource, PublicHealthCalendarFlags };

export const CALENDAR_READINESS_SOURCE_KEYS: Record<CalendarReadinessSource, TranslationKey> = {
  demo: "safePersistence.demoFallback",
  live: "safePersistence.liveApi",
  partial: "liveOperatingState.partialFallback",
};

export function calendarReadinessSourceKey(source: CalendarReadinessSource): TranslationKey {
  return CALENDAR_READINESS_SOURCE_KEYS[source];
}

export function resolveCalendarReadiness(candidateId?: string): CalendarReadinessRecord | null {
  const trimmed = (candidateId ?? CALENDAR_READINESS_DEMO_CANDIDATE_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CALENDAR_READINESS_DEMO_CANDIDATE_ID) {
    return getCalendarReadinessDemo();
  }
  return null;
}

export function microsoftReadinessBlocked(record: CalendarReadinessRecord): boolean {
  const ms = record.providers.find((row) => row.provider === "microsoft");
  return ms?.event_write === "blocked";
}

export function mergePublicHealthCalendarFlags(
  record: CalendarReadinessRecord,
  flags: Partial<PublicHealthCalendarFlags>,
): CalendarReadinessRecord {
  return {
    ...record,
    public_health: {
      google_calendar_configured:
        flags.google_calendar_configured ?? record.public_health.google_calendar_configured,
      microsoft_calendar_configured:
        flags.microsoft_calendar_configured ?? record.public_health.microsoft_calendar_configured,
    },
    source: flags.microsoft_calendar_configured != null ? "partial" : record.source,
  };
}
