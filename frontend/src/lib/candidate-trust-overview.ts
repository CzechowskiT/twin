/** Candidate trust overview — index linking all candidate trust/control modules. */

import {
  CANDIDATE_TRUST_OVERVIEW_DEMO_ID,
  getCandidateTrustOverviewDemo,
  type CandidateTrustOverviewRecord,
} from "@/lib/candidate-trust-overview-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";
import { HIRING_JOURNEY_ROUTES } from "@/lib/hiring-journey";

export { CANDIDATE_TRUST_OVERVIEW_DEMO_ID };

export const CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER = "candidate-trust-overview-page";

export const CANDIDATE_TRUST_OVERVIEW_MARKERS = {
  page: CANDIDATE_TRUST_OVERVIEW_PAGE_MARKER,
  header: "candidate-trust-overview-header",
  moduleMap: "candidate-trust-overview-module-map",
  timeline: "candidate-trust-overview-timeline",
  downloadableRecords: "candidate-trust-overview-downloadable-records",
  pendingActions: "candidate-trust-overview-pending-actions",
  safetyBoundaries: "candidate-trust-overview-safety-boundaries",
  recommendedNext: "candidate-trust-overview-recommended-next",
  linkedModules: "candidate-trust-overview-linked-modules",
  notFound: "candidate-trust-overview-not-found",
  pilotBadge: "candidate-trust-overview-pilot-badge",
} as const;

export const CANDIDATE_TRUST_OVERVIEW_ROUTE = "/dashboard/trust/overview";
export const CANDIDATE_TRUST_OVERVIEW_PROFILE_ALIAS = "/profile/trust/overview";

export const CANDIDATE_TRUST_OVERVIEW_SAFE_LINKS = {
  trustCenter: CANDIDATE_CANONICAL_ROUTES.trust,
  controlCenter: CANDIDATE_CANONICAL_ROUTES.trustControls,
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
  matches: CANDIDATE_CANONICAL_ROUTES.matches,
  profile: CANDIDATE_CANONICAL_ROUTES.profile,
  hiringJourney: HIRING_JOURNEY_ROUTES.candidate,
} as const;

export function candidateTrustOverviewHref(): string {
  return CANDIDATE_TRUST_OVERVIEW_ROUTE;
}

export function resolveCandidateTrustOverview(
  candidateId?: string,
): CandidateTrustOverviewRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_TRUST_OVERVIEW_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_TRUST_OVERVIEW_DEMO_ID) {
    return getCandidateTrustOverviewDemo();
  }
  return null;
}

export function isCandidateTrustOverviewDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_TRUST_OVERVIEW_DEMO_ID;
}
