/** Board calendar readiness monitor — cross-persona OAuth readiness health. */

import {
  getBoardCalendarReadinessMonitorDemo,
  type BoardCalendarReadinessMonitorRecord,
} from "@/lib/board-calendar-readiness-monitor-demo-data";
import { calendarReadinessSourceKey } from "@/lib/calendar-readiness";
import type { TranslationKey } from "@/lib/i18n";

export type { BoardCalendarReadinessMonitorRecord };
export { getBoardCalendarReadinessMonitorDemo };

export const BOARD_CALENDAR_READINESS_MONITOR_ROUTE = "/board/calendar-readiness";

export const BOARD_CALENDAR_READINESS_MONITOR_PAGE_MARKER = "board-calendar-readiness-monitor-page";

export const BOARD_CALENDAR_READINESS_MONITOR_MARKERS = {
  page: BOARD_CALENDAR_READINESS_MONITOR_PAGE_MARKER,
  header: "board-calendar-readiness-monitor-header",
  providerMatrix: "board-calendar-readiness-monitor-provider-matrix",
  publicHealth: "board-calendar-readiness-monitor-public-health",
  blockedCapabilities: "board-calendar-readiness-monitor-blocked-capabilities",
  personaRoutes: "board-calendar-readiness-monitor-persona-routes",
  launch: "board-calendar-readiness-monitor-launch",
  crossLinks: "board-calendar-readiness-monitor-cross-links",
  microsoftBusyRead: "microsoft-calendar-readiness-busy-read",
  sourceBadge: "board-calendar-readiness-monitor-source",
} as const;

export const BOARD_CALENDAR_READINESS_MONITOR_LINKS = [
  { id: "candidate", href: "/dashboard/calendar/readiness", labelKey: "candidateCalendarReadiness.pageTitle" as TranslationKey },
  { id: "busy_read_checklist", href: "/board/microsoft-busy-read-staging-checklist", labelKey: "boardMicrosoftBusyReadStagingChecklist.pageTitle" as TranslationKey },
  { id: "prod_status", href: "/board/production-persistence-status", labelKey: "productionPersistenceStatus.pageEyebrow" as TranslationKey },
  { id: "ops_monitor", href: "/board/persistence-operations-monitor", labelKey: "liveOperatingState.monitorTitle" as TranslationKey },
  { id: "recruiter", href: "/recruiter/daily-cockpit", labelKey: "recruiterDailyCockpit.pageTitle" as TranslationKey },
  { id: "company", href: "/company/hiring-command-center", labelKey: "companyHiringCommandCenter.pageTitle" as TranslationKey },
] as const;

export function boardCalendarReadinessMonitorHref(): string {
  return BOARD_CALENDAR_READINESS_MONITOR_ROUTE;
}

export function resolveBoardCalendarReadinessMonitor(): BoardCalendarReadinessMonitorRecord {
  return getBoardCalendarReadinessMonitorDemo();
}

export { calendarReadinessSourceKey };
