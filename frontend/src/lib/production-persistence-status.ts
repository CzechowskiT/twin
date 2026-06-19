/** Production persistence verification status — read-only internal board. */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getProductionPersistenceStatusDemo,
  type ProductionPersistenceStatusRecord,
} from "@/lib/production-persistence-status-demo-data";

export { LAUNCH_STANCE };
export type { ProductionPersistenceStatusRecord };

export const PRODUCTION_PERSISTENCE_STATUS_ROUTE = "/board/production-persistence-status";

export const PRODUCTION_PERSISTENCE_STATUS_PAGE_MARKER = "production-persistence-status-page";

export const PRODUCTION_PERSISTENCE_STATUS_MARKERS = {
  page: PRODUCTION_PERSISTENCE_STATUS_PAGE_MARKER,
  header: "production-persistence-status-header",
  healthSummary: "production-persistence-status-health-summary",
  commitInterpretation: "production-persistence-status-commit-interpretation",
  migrationChecklist: "production-persistence-status-migration-checklist",
  authSmokeReadiness: "production-persistence-status-auth-smoke-readiness",
  endpointMatrix: "production-persistence-status-endpoint-matrix",
  limitations: "production-persistence-status-limitations",
  nextAction: "production-persistence-status-next-action",
  launch: "production-persistence-status-launch",
  pilotBadge: "production-persistence-status-pilot-badge",
} as const;

export const PRODUCTION_PERSISTENCE_STATUS_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /message sent/i,
  /submitted successfully/i,
  /verified successfully/i,
  /identity verified/i,
  /GDPR compliant/i,
  /automatic outreach/i,
  /AI decided/i,
  /writeback completed/i,
  /persisted successfully/i,
  /saved successfully/i,
  /production write enabled/i,
  /export fulfilled/i,
  /hired/i,
  /rejected/i,
  /offer sent/i,
];

export const PRODUCTION_PERSISTENCE_STATUS_LINKS = [
  { href: "/board/implementation-tracker", labelKey: "implementationTracker.demoJourneyTitle" as TranslationKey },
  { href: "/board/first-working-persistence-plan", labelKey: "firstWorkingPersistencePlan.demoJourneyTitle" as TranslationKey },
  { href: "/investor/product-proof", labelKey: "executiveProductProof.linkProductProof" as TranslationKey },
] as const;

export function productionPersistenceStatusHref(): string {
  return PRODUCTION_PERSISTENCE_STATUS_ROUTE;
}

export function resolveProductionPersistenceStatus(): ProductionPersistenceStatusRecord {
  return getProductionPersistenceStatusDemo();
}
