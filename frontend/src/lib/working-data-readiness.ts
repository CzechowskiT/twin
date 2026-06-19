/** Working data layer readiness — internal board mapping of demo to persistence. */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getWorkingDataReadinessDemo,
  type WorkingDataReadinessRecord,
} from "@/lib/working-data-readiness-demo-data";

export { LAUNCH_STANCE };

export const WORKING_DATA_READINESS_ROUTE = "/board/working-data-readiness";

export const WORKING_DATA_READINESS_PAGE_MARKER = "working-data-readiness-page";

export const WORKING_DATA_READINESS_MARKERS = {
  page: WORKING_DATA_READINESS_PAGE_MARKER,
  header: "working-data-readiness-header",
  entities: "working-data-readiness-entities",
  demoSources: "working-data-readiness-demo-sources",
  persistenceCandidates: "working-data-readiness-persistence-candidates",
  unsafeDeferrals: "working-data-readiness-unsafe-deferrals",
  backendBoundaries: "working-data-readiness-backend-boundaries",
  auditPreview: "working-data-readiness-audit-preview",
  implementation: "working-data-readiness-implementation",
  launch: "working-data-readiness-launch",
  pilotBadge: "working-data-readiness-pilot-badge",
} as const;

export const WORKING_DATA_READINESS_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /automatic outreach/i,
  /GDPR compliant/i,
  /AI decided/i,
  /writeback completed/i,
  /persisted successfully/i,
  /saved successfully/i,
];

export const WORKING_DATA_READINESS_LINKS = [
  { href: "/board/working-features-readiness", labelKey: "workingFeaturesReadiness.demoJourneyTitle" as TranslationKey },
  { href: "/investor/trust-proof", labelKey: "investorTrustProof.demoJourneyTitle" as TranslationKey },
  { href: "/investor/product-proof", labelKey: "executiveProductProof.linkProductProof" as TranslationKey },
] as const;

export function workingDataReadinessHref(): string {
  return WORKING_DATA_READINESS_ROUTE;
}

export function resolveWorkingDataReadiness(): WorkingDataReadinessRecord {
  return getWorkingDataReadinessDemo();
}
