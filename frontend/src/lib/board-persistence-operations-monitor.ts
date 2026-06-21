/** Board persistence operations monitor — cross-persona channel health. */

import {
  getBoardPersistenceOperationsMonitorDemo,
  type BoardPersistenceOperationsMonitorRecord,
  type PublicHealthSnapshot,
} from "@/lib/board-persistence-operations-monitor-demo-data";
import type { TranslationKey } from "@/lib/i18n";
import {
  loadCompanyOperatingState,
  loadRecruiterOperatingState,
  type OperatingStateSummary,
} from "@/lib/live-operating-state";
import { fetchPublicHealthJson } from "@/lib/public-health-client";

export type { BoardPersistenceOperationsMonitorRecord, PublicHealthSnapshot };
export { getBoardPersistenceOperationsMonitorDemo };

export const BOARD_PERSISTENCE_OPERATIONS_MONITOR_ROUTE = "/board/persistence-operations-monitor";

export const BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER = "board-persistence-operations-monitor-page";

export const BOARD_PERSISTENCE_OPERATIONS_MONITOR_MARKERS = {
  page: BOARD_PERSISTENCE_OPERATIONS_MONITOR_PAGE_MARKER,
  header: "board-persistence-operations-monitor-header",
  publicHealth: "board-persistence-operations-monitor-public-health",
  alembic: "board-persistence-operations-monitor-alembic",
  authSmoke: "board-persistence-operations-monitor-auth-smoke",
  endpointMatrix: "board-persistence-operations-monitor-endpoint-matrix",
  operationalSurfaces: "board-persistence-operations-monitor-operational-surfaces",
  blockedCapabilities: "board-persistence-operations-monitor-blocked-capabilities",
  launch: "board-persistence-operations-monitor-launch",
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

export function resolveBoardPersistenceOperationsMonitor(): BoardPersistenceOperationsMonitorRecord {
  return getBoardPersistenceOperationsMonitorDemo();
}

export async function loadPublicHealthSnapshot(): Promise<PublicHealthSnapshot> {
  const fallback = getBoardPersistenceOperationsMonitorDemo().publicHealthFallback;
  try {
    const live = await fetchPublicHealthJson<Record<string, unknown>>();
    return {
      status: String(live.status ?? fallback.status),
      db_ok: Boolean(live.db_ok ?? fallback.db_ok),
      frontend_commit: String(live.frontend_commit ?? fallback.frontend_commit),
      api_commit: String(live.api_commit ?? live.backend_git_commit ?? fallback.api_commit),
      commit_interpretation: String(live.commit_interpretation ?? fallback.commit_interpretation),
      source: "live",
    };
  } catch {
    return fallback;
  }
}
