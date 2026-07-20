/** Candidate identity verification — manual review status live path; Authologic start remains policy-held. */

import {
  CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID,
  getCandidateIdentityVerificationDemo,
  type CandidateIdentityVerificationBundle,
  type CandidateIdentityVerificationRecord,
} from "@/lib/candidate-identity-verification-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

export { CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID };

export const CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER = "candidate-identity-verification-page";

export const CANDIDATE_IDENTITY_VERIFICATION_MARKERS = {
  page: CANDIDATE_IDENTITY_VERIFICATION_PAGE_MARKER,
  header: "candidate-identity-verification-header",
  currentStatus: "candidate-identity-verification-current-status",
  futureFlowPreview: "candidate-identity-verification-future-flow",
  dataSharedPreview: "candidate-identity-verification-data-shared",
  disabledActions: "candidate-identity-verification-disabled-actions",
  auditTimeline: "candidate-identity-verification-audit-timeline",
  linkedModules: "candidate-identity-verification-linked-modules",
  boundary: "candidate-identity-verification-boundary",
  notFound: "candidate-identity-verification-not-found",
  pilotBadge: "candidate-identity-verification-pilot-badge",
  startDisabled: "candidate-identity-verification-start-disabled",
} as const;

export const CANDIDATE_IDENTITY_VERIFICATION_ROUTE = "/dashboard/trust/identity-verification";
export const CANDIDATE_IDENTITY_VERIFICATION_PROFILE_ALIAS = "/profile/trust/identity-verification";

export const CANDIDATE_IDENTITY_VERIFICATION_SAFE_LINKS = {
  trustCenter: CANDIDATE_CANONICAL_ROUTES.trust,
  controlCenter: CANDIDATE_CANONICAL_ROUTES.trustControls,
  exportPreview: CANDIDATE_CANONICAL_ROUTES.trustExportPreview,
  corrections: CANDIDATE_CANONICAL_ROUTES.trustCorrections,
  auditExport: CANDIDATE_CANONICAL_ROUTES.trustAuditExport,
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  profile: CANDIDATE_CANONICAL_ROUTES.profile,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
  matches: CANDIDATE_CANONICAL_ROUTES.matches,
  identityLegacy: CANDIDATE_CANONICAL_ROUTES.identity,
} as const;

export function candidateIdentityVerificationHref(): string {
  return CANDIDATE_IDENTITY_VERIFICATION_ROUTE;
}

export function resolveCandidateIdentityVerification(
  candidateId?: string,
): CandidateIdentityVerificationRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID) {
    return getCandidateIdentityVerificationDemo();
  }
  return null;
}

export function buildIdentityVerificationBundle(
  record?: CandidateIdentityVerificationRecord,
): CandidateIdentityVerificationBundle {
  return (record ?? getCandidateIdentityVerificationDemo()).bundle;
}

export function isCandidateIdentityVerificationDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_IDENTITY_VERIFICATION_DEMO_ID;
}
