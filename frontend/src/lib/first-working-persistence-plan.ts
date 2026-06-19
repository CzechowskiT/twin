/** First working persistence plan — spec-only backend rollout sequence (no routes/writes). */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getFirstWorkingPersistencePlanDemo,
  type BackendSequenceStep,
  type FirstWorkingPersistencePlanRecord,
} from "@/lib/first-working-persistence-plan-demo-data";

export { LAUNCH_STANCE };
export type { BackendSequenceStep, FirstWorkingPersistencePlanRecord };

export const FIRST_WORKING_PERSISTENCE_PLAN_ROUTE = "/board/first-working-persistence-plan";

export const FIRST_WORKING_PERSISTENCE_PLAN_PAGE_MARKER = "first-working-persistence-plan-page";

export const FIRST_WORKING_PERSISTENCE_PLAN_MARKERS = {
  page: FIRST_WORKING_PERSISTENCE_PLAN_PAGE_MARKER,
  header: "first-working-persistence-plan-header",
  backendSequence: "first-working-persistence-plan-backend-sequence",
  entityTargets: "first-working-persistence-plan-entity-targets",
  scopeBoundaries: "first-working-persistence-plan-scope-boundaries",
  deferredActions: "first-working-persistence-plan-deferred-actions",
  migrationGates: "first-working-persistence-plan-migration-gates",
  dependencyOrder: "first-working-persistence-plan-dependency-order",
  verificationChecklist: "first-working-persistence-plan-verification-checklist",
  noBackendWrites: "first-working-persistence-plan-no-backend-writes",
  launchStatus: "first-working-persistence-plan-launch-status",
  pilotBadge: "first-working-persistence-plan-pilot-badge",
} as const;

export const FIRST_WORKING_PERSISTENCE_PLAN_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /automatic outreach/i,
  /GDPR compliant/i,
  /AI decided/i,
  /writeback completed/i,
  /persisted successfully/i,
  /saved successfully/i,
  /ATS sync completed/i,
];

export const FIRST_WORKING_PERSISTENCE_PLAN_LINKS = [
  { href: "/board/working-data-readiness", labelKey: "workingDataReadiness.demoJourneyTitle" as TranslationKey },
  { href: "/board/implementation-tracker", labelKey: "implementationTracker.demoJourneyTitle" as TranslationKey },
] as const;

export function firstWorkingPersistencePlanHref(): string {
  return FIRST_WORKING_PERSISTENCE_PLAN_ROUTE;
}

export function resolveFirstWorkingPersistencePlan(): FirstWorkingPersistencePlanRecord {
  return getFirstWorkingPersistencePlanDemo();
}
