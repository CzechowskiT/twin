/** Candidate revoke & delete request — read-only demo draft (no backend writes). */

import {
  CANDIDATE_REVOKE_DELETE_DEMO_ID,
  getCandidateRevokeDeleteDemo,
  type CandidateRevokeDeleteBundle,
  type CandidateRevokeDeleteRecord,
} from "@/lib/candidate-revoke-delete-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

export { CANDIDATE_REVOKE_DELETE_DEMO_ID };

export const CANDIDATE_REVOKE_DELETE_PAGE_MARKER = "candidate-revoke-delete-page";

export const CANDIDATE_REVOKE_DELETE_MARKERS = {
  page: CANDIDATE_REVOKE_DELETE_PAGE_MARKER,
  header: "candidate-revoke-delete-header",
  requestTypeSelector: "candidate-revoke-delete-request-type-selector",
  impactPreview: "candidate-revoke-delete-impact-preview",
  includedExcludedScope: "candidate-revoke-delete-included-excluded-scope",
  draftRequest: "candidate-revoke-delete-draft",
  auditTimeline: "candidate-revoke-delete-audit-timeline",
  linkedModules: "candidate-revoke-delete-linked-modules",
  plannedWorkflow: "candidate-revoke-delete-planned-workflow",
  boundary: "candidate-revoke-delete-boundary",
  notFound: "candidate-revoke-delete-not-found",
  pilotBadge: "candidate-revoke-delete-pilot-badge",
  submitDisabled: "candidate-revoke-delete-submit-disabled",
} as const;

export const CANDIDATE_REVOKE_DELETE_ROUTE = "/dashboard/trust/revoke-delete";
export const CANDIDATE_REVOKE_DELETE_PROFILE_ALIAS = "/profile/trust/revoke-delete";

export const CANDIDATE_REVOKE_DELETE_SAFE_LINKS = {
  trustCenter: CANDIDATE_CANONICAL_ROUTES.trust,
  controlCenter: CANDIDATE_CANONICAL_ROUTES.trustControls,
  exportPreview: CANDIDATE_CANONICAL_ROUTES.trustExportPreview,
  corrections: CANDIDATE_CANONICAL_ROUTES.trustCorrections,
  dataPortability: CANDIDATE_CANONICAL_ROUTES.trustPortability,
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  profile: CANDIDATE_CANONICAL_ROUTES.profile,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
  matches: CANDIDATE_CANONICAL_ROUTES.matches,
} as const;

export function candidateRevokeDeleteHref(): string {
  return CANDIDATE_REVOKE_DELETE_ROUTE;
}

export function resolveCandidateRevokeDelete(
  candidateId?: string,
): CandidateRevokeDeleteRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_REVOKE_DELETE_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_REVOKE_DELETE_DEMO_ID) {
    return getCandidateRevokeDeleteDemo();
  }
  return null;
}

export function buildRevokeDeleteBundle(
  record?: CandidateRevokeDeleteRecord,
): CandidateRevokeDeleteBundle {
  return (record ?? getCandidateRevokeDeleteDemo()).bundle;
}

export function isCandidateRevokeDeleteDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_REVOKE_DELETE_DEMO_ID;
}
