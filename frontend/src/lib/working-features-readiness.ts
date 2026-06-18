/** Working features readiness matrix — internal board roadmap surface. */

import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  getWorkingFeaturesReadinessDemo,
  type WorkingFeaturesReadinessRecord,
} from "@/lib/working-features-readiness-demo-data";

export { LAUNCH_STANCE };

export const WORKING_FEATURES_READINESS_ROUTE = "/board/working-features-readiness";

export const WORKING_FEATURES_READINESS_PAGE_MARKER = "working-features-readiness-page";

export const WORKING_FEATURES_READINESS_MARKERS = {
  page: WORKING_FEATURES_READINESS_PAGE_MARKER,
  header: "working-features-readiness-header",
  candidateMatrix: "working-features-readiness-candidate-matrix",
  recruiterMatrix: "working-features-readiness-recruiter-matrix",
  companyMatrix: "working-features-readiness-company-matrix",
  investorMatrix: "working-features-readiness-investor-matrix",
  backend: "working-features-readiness-backend",
  riskOrder: "working-features-readiness-risk-order",
  implementation: "working-features-readiness-implementation",
  launch: "working-features-readiness-launch",
  pilotBadge: "working-features-readiness-pilot-badge",
} as const;

export const WORKING_FEATURES_READINESS_FORBIDDEN_PATTERNS: RegExp[] = [
  /email sent/i,
  /automatic outreach/i,
  /GDPR compliant/i,
  /AI decided/i,
  /writeback completed/i,
];

export const WORKING_FEATURES_READINESS_LINKS = [
  { href: "/investor/product-proof", labelKey: "investorTrustProof.linkProductProof" as TranslationKey },
  { href: "/investor/trust-proof", labelKey: "investorTrustProof.demoJourneyTitle" as TranslationKey },
] as const;

export function workingFeaturesReadinessHref(): string {
  return WORKING_FEATURES_READINESS_ROUTE;
}

export function resolveWorkingFeaturesReadiness(): WorkingFeaturesReadinessRecord {
  return getWorkingFeaturesReadinessDemo();
}
