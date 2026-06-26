/** Board placement evidence monitor — cross-persona evidence health. */

import {
  getBoardPlacementEvidenceMonitorDemo,
  type BoardPlacementEvidenceMonitorRecord,
} from "@/lib/board-placement-evidence-monitor-demo-data";
import { placementVerificationSourceKey } from "@/lib/placement-verification";
import type { TranslationKey } from "@/lib/i18n";

export type { BoardPlacementEvidenceMonitorRecord };
export { getBoardPlacementEvidenceMonitorDemo };

export const BOARD_PLACEMENT_EVIDENCE_MONITOR_ROUTE = "/board/placement-verification";

export const BOARD_PLACEMENT_EVIDENCE_MONITOR_PAGE_MARKER = "board-placement-evidence-monitor-page";

export const BOARD_PLACEMENT_EVIDENCE_MONITOR_MARKERS = {
  page: BOARD_PLACEMENT_EVIDENCE_MONITOR_PAGE_MARKER,
  header: "board-placement-evidence-monitor-header",
  evidenceMatrix: "board-placement-evidence-monitor-evidence-matrix",
  operatingEvidence: "placement-verification-evidence-panel",
  economicsPreview: "board-placement-evidence-monitor-economics-preview",
  riskFlags: "board-placement-evidence-monitor-risk-flags",
  blockedCapabilities: "board-placement-evidence-monitor-blocked-capabilities",
  launch: "board-placement-evidence-monitor-launch",
  personaRoutes: "board-placement-evidence-monitor-persona-routes",
  crossLinks: "board-placement-evidence-monitor-cross-links",
  sourceBadge: "board-placement-evidence-monitor-source",
} as const;

export const BOARD_PLACEMENT_EVIDENCE_MONITOR_LINKS = [
  { id: "prod_status", href: "/board/production-persistence-status", labelKey: "productionPersistenceStatus.pageEyebrow" as TranslationKey },
  { id: "ops_monitor", href: "/board/persistence-operations-monitor", labelKey: "liveOperatingState.monitorTitle" as TranslationKey },
  { id: "candidate_preview", href: "/dashboard/placement-verification", labelKey: "candidatePlacementVerification.pageTitle" as TranslationKey },
  { id: "recruiter_checklist", href: "/recruiter/placement-verification", labelKey: "placementChecklist.recruiterPageTitle" as TranslationKey },
  { id: "company_checklist", href: "/company/placement-verification", labelKey: "placementChecklist.companyPageTitle" as TranslationKey },
  { id: "hiring_journey", href: "/board/hiring-journey", labelKey: "hiringJourney.crossLinkHiringJourney" as TranslationKey },
] as const;

export function boardPlacementEvidenceMonitorHref(): string {
  return BOARD_PLACEMENT_EVIDENCE_MONITOR_ROUTE;
}

export function resolveBoardPlacementEvidenceMonitor(): BoardPlacementEvidenceMonitorRecord {
  return getBoardPlacementEvidenceMonitorDemo();
}

export { placementVerificationSourceKey };
