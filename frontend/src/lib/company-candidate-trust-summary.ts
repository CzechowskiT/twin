/** Company candidate trust summary — read-only company view without PII. */

import { candidateTrustHref } from "@/lib/candidate-trust";
import { companyHiringCockpitHref } from "@/lib/company-hiring-cockpit";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";
import type { TranslationKey } from "@/lib/i18n";
import {
  COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID,
  getCompanyCandidateTrustSummaryDemo,
  type CompanyCandidateTrustSummaryRecord,
} from "@/lib/company-candidate-trust-summary-demo-data";

export { COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID };
export { LAUNCH_STANCE };

export const COMPANY_CANDIDATE_TRUST_SUMMARY_ROUTE = "/company/candidates/demo-candidate-001/trust-summary";

export const COMPANY_CANDIDATE_TRUST_SUMMARY_PAGE_MARKER = "company-candidate-trust-summary-page";

export const COMPANY_CANDIDATE_TRUST_SUMMARY_MARKERS = {
  page: COMPANY_CANDIDATE_TRUST_SUMMARY_PAGE_MARKER,
  header: "company-candidate-trust-summary-header",
  status: "company-candidate-trust-summary-status",
  visibility: "company-candidate-trust-summary-visibility",
  evidence: "company-candidate-trust-summary-evidence",
  notShared: "company-candidate-trust-summary-not-shared",
  reviewNotes: "company-candidate-trust-summary-review-notes",
  boundary: "company-candidate-trust-summary-boundary",
  linkedModules: "company-candidate-trust-summary-linked-modules",
  pilotBadge: "company-candidate-trust-summary-pilot-badge",
  notFound: "company-candidate-trust-summary-not-found",
} as const;

export const COMPANY_CANDIDATE_TRUST_SUMMARY_LINKS = [
  { id: "hiring_cockpit", href: companyHiringCockpitHref(), labelKey: "companyCandidateTrustSummary.linkHiringCockpit" as TranslationKey },
  {
    id: "candidate_trust",
    href: candidateTrustHref(COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID, "company"),
    labelKey: "companyCandidateTrustSummary.linkCandidateTrust" as TranslationKey,
  },
] as const;

export function companyCandidateTrustSummaryHref(candidateId = COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID): string {
  return `/company/candidates/${candidateId.trim()}/trust-summary`;
}

export function resolveCompanyCandidateTrustSummary(candidateId?: string): CompanyCandidateTrustSummaryRecord | null {
  const id = (candidateId ?? COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID).trim();
  if (id !== COMPANY_CANDIDATE_TRUST_SUMMARY_DEMO_ID) return null;
  return getCompanyCandidateTrustSummaryDemo();
}
