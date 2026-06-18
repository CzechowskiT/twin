/** Candidate data portability request — read-only demo draft (no backend writes). */

import {
  CANDIDATE_DATA_PORTABILITY_DEMO_ID,
  getCandidateDataPortabilityDemo,
  type CandidateDataPortabilityBundle,
  type CandidateDataPortabilityRecord,
} from "@/lib/candidate-data-portability-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

export { CANDIDATE_DATA_PORTABILITY_DEMO_ID };

export const CANDIDATE_DATA_PORTABILITY_PAGE_MARKER = "candidate-data-portability-page";

export const CANDIDATE_DATA_PORTABILITY_MARKERS = {
  page: CANDIDATE_DATA_PORTABILITY_PAGE_MARKER,
  header: "candidate-data-portability-header",
  portabilityScope: "candidate-data-portability-scope",
  includedChecklist: "candidate-data-portability-included-checklist",
  excludedChecklist: "candidate-data-portability-excluded-checklist",
  draftRequest: "candidate-data-portability-draft",
  auditTimeline: "candidate-data-portability-audit-timeline",
  linkedModules: "candidate-data-portability-linked-modules",
  plannedWorkflow: "candidate-data-portability-planned-workflow",
  boundary: "candidate-data-portability-boundary",
  notFound: "candidate-data-portability-not-found",
  pilotBadge: "candidate-data-portability-pilot-badge",
  submitDisabled: "candidate-data-portability-submit-disabled",
} as const;

export const CANDIDATE_DATA_PORTABILITY_ROUTE = "/dashboard/trust/portability";
export const CANDIDATE_DATA_PORTABILITY_PROFILE_ALIAS = "/profile/trust/portability";

export const CANDIDATE_DATA_PORTABILITY_SAFE_LINKS = {
  trustCenter: CANDIDATE_CANONICAL_ROUTES.trust,
  controlCenter: CANDIDATE_CANONICAL_ROUTES.trustControls,
  exportPreview: CANDIDATE_CANONICAL_ROUTES.trustExportPreview,
  corrections: CANDIDATE_CANONICAL_ROUTES.trustCorrections,
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  profile: CANDIDATE_CANONICAL_ROUTES.profile,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
  matches: CANDIDATE_CANONICAL_ROUTES.matches,
} as const;

export function candidateDataPortabilityHref(): string {
  return CANDIDATE_DATA_PORTABILITY_ROUTE;
}

export function resolveCandidateDataPortability(
  candidateId?: string,
): CandidateDataPortabilityRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_DATA_PORTABILITY_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_DATA_PORTABILITY_DEMO_ID) {
    return getCandidateDataPortabilityDemo();
  }
  return null;
}

export function buildDataPortabilityBundle(
  record?: CandidateDataPortabilityRecord,
): CandidateDataPortabilityBundle {
  return (record ?? getCandidateDataPortabilityDemo()).bundle;
}

export function isCandidateDataPortabilityDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_DATA_PORTABILITY_DEMO_ID;
}
