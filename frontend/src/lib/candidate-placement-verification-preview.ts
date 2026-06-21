/** Candidate placement verification preview — demo-only status surface. */

import {
  missingExternalConfirmation,
  placementVerificationSourceKey,
  PLACEMENT_VERIFICATION_DEMO_ID,
  resolvePlacementVerification,
  type PlacementVerificationRecord,
} from "@/lib/placement-verification";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

export const CANDIDATE_PLACEMENT_VERIFICATION_ROUTE = "/dashboard/placement-verification";
export const CANDIDATE_PLACEMENT_VERIFICATION_PROFILE_ALIAS = "/profile/placement-verification";

export const CANDIDATE_PLACEMENT_VERIFICATION_PAGE_MARKER = "candidate-placement-verification-page";

export const CANDIDATE_PLACEMENT_VERIFICATION_MARKERS = {
  page: CANDIDATE_PLACEMENT_VERIFICATION_PAGE_MARKER,
  header: "candidate-placement-verification-header",
  status: "candidate-placement-verification-status",
  evidence: "candidate-placement-verification-evidence",
  externalGap: "candidate-placement-verification-external-gap",
  riskFlags: "candidate-placement-verification-risk-flags",
  demoActions: "candidate-placement-verification-demo-actions",
  sourceBadge: "candidate-placement-verification-source",
  notFound: "candidate-placement-verification-not-found",
} as const;

export const CANDIDATE_PLACEMENT_VERIFICATION_SAFE_LINKS = {
  trustCenter: CANDIDATE_CANONICAL_ROUTES.trust,
  trustOverview: "/dashboard/trust/overview",
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
} as const;

export function candidatePlacementVerificationHref(): string {
  return CANDIDATE_PLACEMENT_VERIFICATION_ROUTE;
}

export function resolveCandidatePlacementVerification(
  placementId?: string,
): PlacementVerificationRecord | null {
  return resolvePlacementVerification(placementId ?? PLACEMENT_VERIFICATION_DEMO_ID);
}

export function candidatePlacementMissingExternal(record: PlacementVerificationRecord): boolean {
  return missingExternalConfirmation(record);
}

export { placementVerificationSourceKey };
