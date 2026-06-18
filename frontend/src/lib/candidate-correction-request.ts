/** Candidate correction request workflow — read-only demo draft (no backend writes). */

import {
  CANDIDATE_CORRECTION_REQUEST_DEMO_ID,
  getCandidateCorrectionRequestDemo,
  type CandidateCorrectionRequestBundle,
  type CandidateCorrectionRequestRecord,
} from "@/lib/candidate-correction-request-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

export { CANDIDATE_CORRECTION_REQUEST_DEMO_ID };

export const CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER = "candidate-correction-request-page";

export const CANDIDATE_CORRECTION_REQUEST_MARKERS = {
  page: CANDIDATE_CORRECTION_REQUEST_PAGE_MARKER,
  header: "candidate-correction-request-header",
  categories: "candidate-correction-request-categories",
  draftRequest: "candidate-correction-request-draft",
  evidence: "candidate-correction-request-evidence",
  review: "candidate-correction-request-review",
  auditPreview: "candidate-correction-request-audit-preview",
  linkedModules: "candidate-correction-request-linked-modules",
  plannedWorkflow: "candidate-correction-request-planned-workflow",
  boundary: "candidate-correction-request-boundary",
  notFound: "candidate-correction-request-not-found",
  pilotBadge: "candidate-correction-request-pilot-badge",
  submitDisabled: "candidate-correction-request-submit-disabled",
} as const;

export const CANDIDATE_CORRECTION_REQUEST_ROUTE = "/dashboard/trust/corrections";
export const CANDIDATE_CORRECTION_REQUEST_PROFILE_ALIAS = "/profile/trust/corrections";

export const CANDIDATE_CORRECTION_REQUEST_SAFE_LINKS = {
  trustCenter: CANDIDATE_CANONICAL_ROUTES.trust,
  controlCenter: CANDIDATE_CANONICAL_ROUTES.trustControls,
  exportPreview: CANDIDATE_CANONICAL_ROUTES.trustExportPreview,
  dataPortability: CANDIDATE_CANONICAL_ROUTES.trustPortability,
  revokeDelete: CANDIDATE_CANONICAL_ROUTES.trustRevokeDelete,
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  profile: CANDIDATE_CANONICAL_ROUTES.profile,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
  matches: CANDIDATE_CANONICAL_ROUTES.matches,
} as const;

export function candidateCorrectionRequestHref(): string {
  return CANDIDATE_CORRECTION_REQUEST_ROUTE;
}

export function resolveCandidateCorrectionRequest(
  candidateId?: string,
): CandidateCorrectionRequestRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_CORRECTION_REQUEST_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_CORRECTION_REQUEST_DEMO_ID) {
    return getCandidateCorrectionRequestDemo();
  }
  return null;
}

export function buildCorrectionRequestBundle(
  record?: CandidateCorrectionRequestRecord,
): CandidateCorrectionRequestBundle {
  return (record ?? getCandidateCorrectionRequestDemo()).bundle;
}

export function isCandidateCorrectionRequestDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_CORRECTION_REQUEST_DEMO_ID;
}
