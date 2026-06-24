/** Board Microsoft busy-read staging checklist — read-only internal board. */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getBoardMicrosoftBusyReadStagingChecklistDemo,
  type BoardMicrosoftBusyReadStagingChecklistRecord,
} from "@/lib/board-microsoft-busy-read-staging-checklist-demo-data";
import { boardCalendarReadinessMonitorHref } from "@/lib/board-calendar-readiness-monitor";

export { LAUNCH_STANCE };
export type { BoardMicrosoftBusyReadStagingChecklistRecord };

export const BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_ROUTE =
  "/board/microsoft-busy-read-staging-checklist";

export const BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_PAGE_MARKER =
  "board-microsoft-busy-read-staging-checklist-page";

export const BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_MARKERS = {
  page: BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_PAGE_MARKER,
  header: "board-microsoft-busy-read-staging-checklist-header",
  prodGates: "board-microsoft-busy-read-staging-checklist-prod-gates",
  smokeCommands: "board-microsoft-busy-read-staging-checklist-smoke-commands",
  uiExpectations: "board-microsoft-busy-read-staging-checklist-ui-expectations",
  hardBans: "board-microsoft-busy-read-staging-checklist-hard-bans",
  launch: "board-microsoft-busy-read-staging-checklist-launch",
  crossLinks: "board-microsoft-busy-read-staging-checklist-cross-links",
  stagingBanner: "microsoft-busy-read-staging-status",
} as const;

export const BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_FORBIDDEN_PATTERNS: RegExp[] = [
  /calendar synced/i,
  /event created/i,
  /invite sent/i,
  /email sent/i,
  /token displayed/i,
  /access_token/i,
];

export const BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_LINKS = [
  {
    id: "calendar_readiness",
    href: boardCalendarReadinessMonitorHref(),
    labelKey: "boardCalendarReadiness.pageTitle" as TranslationKey,
  },
  {
    id: "prod_status",
    href: "/board/production-persistence-status",
    labelKey: "productionPersistenceStatus.pageEyebrow" as TranslationKey,
  },
  {
    id: "ops_monitor",
    href: "/board/persistence-operations-monitor",
    labelKey: "liveOperatingState.monitorTitle" as TranslationKey,
  },
  {
    id: "candidate_readiness",
    href: "/dashboard/calendar/readiness",
    labelKey: "candidateCalendarReadiness.pageTitle" as TranslationKey,
  },
] as const;

export function boardMicrosoftBusyReadStagingChecklistHref(): string {
  return BOARD_MICROSOFT_BUSY_READ_STAGING_CHECKLIST_ROUTE;
}

export function resolveBoardMicrosoftBusyReadStagingChecklist(): BoardMicrosoftBusyReadStagingChecklistRecord {
  return getBoardMicrosoftBusyReadStagingChecklistDemo();
}
