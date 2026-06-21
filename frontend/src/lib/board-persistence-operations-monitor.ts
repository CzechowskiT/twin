/** Board persistence operations monitor — cross-persona channel health. */

import type { TranslationKey } from "@/lib/i18n";
import {
  loadCompanyOperatingState,
  loadRecruiterOperatingState,
  type OperatingStateSummary,
} from "@/lib/live-operating-state";

export const BOARD_PERSISTENCE_OPERATIONS_MONITOR_ROUTE = "/board/persistence-operations-monitor";

export const BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER = "board-persistence-operations-monitor-page";

export const BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS = {
  page: BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER,
  header: "board-persistence-operations-monitor-header",
  recruiterPanel: "board-persistence-operations-monitor-recruiter",
  companyPanel: "board-persistence-operations-monitor-company",
  crossLinks: "board-persistence-operations-monitor-cross-links",
} as const;

export const BOARD_PERSISTENCE_OPERATIONS_MONITOR_LINKS = [
  { id: "prod_status", href: "/board/production-persistence-status", labelKey: "productionPersistenceStatus.pageEyebrow" as TranslationKey },
  { id: "audit_foundation", href: "/board/audit-event-foundation", labelKey: "auditEventFoundation.pageEyebrow" as TranslationKey },
  { id: "first_plan", href: "/board/first-working-persistence-plan", labelKey: "firstWorkingPersistencePlan.demoJourneyTitle" as TranslationKey },
  { id: "daily_cockpit", href: "/recruiter/daily-cockpit", labelKey: "recruiterDailyCockpit.openDailyCockpit" as TranslationKey },
  { id: "command_center", href: "/company/hiring-command-center", labelKey: "companyHiringCommandCenter.openCommandCenter" as TranslationKey },
] as const;

export type BoardOperatingState = {
  recruiter: OperatingStateSummary;
  company: OperatingStateSummary;
};

export async function loadBoardOperatingState(): Promise<BoardOperatingState> {
  const [recruiter, company] = await Promise.all([loadRecruiterOperatingState(), loadCompanyOperatingState()]);
  return { recruiter, company };
}

export function boardPersistenceOperationsMonitorHref(): string {
  return BOARD_PERSISTENCE_OPERATIONS_MONITOR_ROUTE;
}
