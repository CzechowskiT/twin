/** Candidate offer readiness center — routes, markers, safe links. */

import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import {
  adaptCandidateOfferReadiness,
  offerReadinessSourceKey,
  OFFER_READINESS_DEMO_CANDIDATE_ID,
  OFFER_READINESS_DEMO_ROLE_ID,
  resolveCandidateOfferReadiness,
  type OfferReadinessRecord,
} from "@/lib/offer-readiness";

export const CANDIDATE_OFFER_READINESS_ROUTE = "/dashboard/offer-readiness";
export const CANDIDATE_OFFER_READINESS_PROFILE_ALIAS = "/profile/offer-readiness";

export const CANDIDATE_OFFER_READINESS_PAGE_MARKER = "candidate-offer-readiness-page";

export const CANDIDATE_OFFER_READINESS_MARKERS = {
  page: CANDIDATE_OFFER_READINESS_PAGE_MARKER,
  header: "candidate-offer-readiness-header",
  summary: "candidate-offer-readiness-summary",
  checklist: "candidate-offer-readiness-checklist",
  comparison: "candidate-offer-readiness-comparison",
  questions: "candidate-offer-readiness-questions",
  boundary: "candidate-offer-readiness-boundary",
  crossLinks: "candidate-offer-readiness-cross-links",
  operatingEvidence: "offer-readiness-evidence-panel",
  sourceBadge: "candidate-offer-readiness-source",
  notFound: "candidate-offer-readiness-not-found",
} as const;

export const CANDIDATE_OFFER_READINESS_CROSS_LINKS = [
  {
    id: "trust_overview",
    href: "/dashboard/trust/overview",
    labelKey: "candidateTrustOverview.pageTitle" as const,
  },
  {
    id: "control_center",
    href: CANDIDATE_CANONICAL_ROUTES.trustControls,
    labelKey: "candidateControlCenter.pageTitle" as const,
  },
  {
    id: "placement_verification",
    href: "/dashboard/placement-verification",
    labelKey: "candidatePlacementVerification.pageTitle" as const,
  },
  {
    id: "calendar_readiness",
    href: "/dashboard/calendar/readiness",
    labelKey: "candidateCalendarReadiness.pageTitle" as const,
  },
  {
    id: "decision_memory",
    href: "/recruiter/jobs/demo-role-001/decision-memory",
    labelKey: "candidateOfferReadiness.linkDecisionMemory" as const,
  },
] as const;

export const CANDIDATE_OFFER_READINESS_SAFE_LINKS = {
  trustOverview: "/dashboard/trust/overview",
  controlCenter: CANDIDATE_CANONICAL_ROUTES.trustControls,
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
} as const;

export function candidateOfferReadinessHref(): string {
  return CANDIDATE_OFFER_READINESS_ROUTE;
}

export function resolveCandidateOfferReadinessView(): OfferReadinessRecord | null {
  const record = resolveCandidateOfferReadiness(
    OFFER_READINESS_DEMO_CANDIDATE_ID,
    OFFER_READINESS_DEMO_ROLE_ID,
  );
  if (!record) return null;
  return adaptCandidateOfferReadiness(record);
}

export { offerReadinessSourceKey, OFFER_READINESS_DEMO_CANDIDATE_ID, OFFER_READINESS_DEMO_ROLE_ID };
