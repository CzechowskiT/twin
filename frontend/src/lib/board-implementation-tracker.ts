/** Board implementation tracker — internal feature milestone tracking (demo only). */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getImplementationTrackerDemo,
  type ImplementationFeatureRow,
  type ImplementationTrackerRecord,
} from "@/lib/board-implementation-tracker-demo-data";
import {
  BOARD_PERSISTENCE_BLOCKED_KEYS,
  BOARD_PERSISTENCE_BLOCKED_MARKER,
  BOARD_PERSISTENCE_SHIPPED_KEYS,
  BOARD_PERSISTENCE_SHIPPED_MARKER,
} from "@/lib/board-persistence-state";

export { LAUNCH_STANCE };
export type { ImplementationFeatureRow, ImplementationTrackerRecord };

export const BOARD_IMPLEMENTATION_TRACKER_ROUTE = "/board/implementation-tracker";

export const BOARD_IMPLEMENTATION_TRACKER_PAGE_MARKER = "board-implementation-tracker-page";

export const BOARD_IMPLEMENTATION_TRACKER_MARKERS = {
  page: BOARD_IMPLEMENTATION_TRACKER_PAGE_MARKER,
  header: "board-implementation-tracker-header",
  persistenceFeatures: "board-implementation-tracker-persistence-features",
  queueFeatures: "board-implementation-tracker-queue-features",
  exportFeatures: "board-implementation-tracker-export-features",
  intakeFeatures: "board-implementation-tracker-intake-features",
  emailFeatures: "board-implementation-tracker-email-features",
  atsFeatures: "board-implementation-tracker-ats-features",
  dependencyMap: "board-implementation-tracker-dependency-map",
  ownerSummary: "board-implementation-tracker-owner-summary",
  blockedRegister: "board-implementation-tracker-blocked-register",
  pilotBadge: "board-implementation-tracker-pilot-badge",
  shippedState: BOARD_PERSISTENCE_SHIPPED_MARKER,
  blockedState: BOARD_PERSISTENCE_BLOCKED_MARKER,
} as const;

export const BOARD_IMPLEMENTATION_TRACKER_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /automatic outreach/i,
  /GDPR compliant/i,
  /AI decided/i,
  /writeback completed/i,
  /persisted successfully/i,
  /saved successfully/i,
  /ATS sync completed/i,
];

export const BOARD_IMPLEMENTATION_TRACKER_LINKS = [
  { href: "/board/working-data-readiness", labelKey: "workingDataReadiness.demoJourneyTitle" as TranslationKey },
  { href: "/board/working-features-readiness", labelKey: "workingFeaturesReadiness.demoJourneyTitle" as TranslationKey },
] as const;

export function boardImplementationTrackerHref(): string {
  return BOARD_IMPLEMENTATION_TRACKER_ROUTE;
}

export function resolveImplementationTracker(): ImplementationTrackerRecord {
  return getImplementationTrackerDemo();
}

export function getImplementationTrackerOwners(): string[] {
  const owners = new Set<string>();
  for (const row of getImplementationTrackerDemo().all_features) {
    owners.add(row.owner);
  }
  return [...owners].sort();
}

export { BOARD_PERSISTENCE_BLOCKED_KEYS, BOARD_PERSISTENCE_SHIPPED_KEYS };
