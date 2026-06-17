/** Candidate Trust Center — candidate-facing transparency layer (pilot). */

import {
  CANDIDATE_TRUST_CENTER_DEMO_ID,
  getCandidateTrustCenterDemo,
  type CandidateTrustCenterRecord,
} from "@/lib/candidate-trust-center-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

export { CANDIDATE_TRUST_CENTER_DEMO_ID };

export const CANDIDATE_TRUST_CENTER_PAGE_MARKER = "candidate-trust-center-page";

export const CANDIDATE_TRUST_CENTER_MARKERS = {
  page: CANDIDATE_TRUST_CENTER_PAGE_MARKER,
  header: "candidate-trust-center-header",
  whatTwinKnows: "candidate-trust-center-what-twin-knows",
  dataSources: "candidate-trust-center-data-sources",
  visibility: "candidate-trust-center-visibility",
  consentDataUse: "candidate-trust-center-consent-data-use",
  communicationPreferences: "candidate-trust-center-communication-preferences",
  humanDecisioning: "candidate-trust-center-human-decisioning",
  candidateControls: "candidate-trust-center-candidate-controls",
  trustTimeline: "candidate-trust-center-trust-timeline",
  boundary: "candidate-trust-center-boundary",
  notFound: "candidate-trust-center-not-found",
  pilotBadge: "candidate-trust-center-pilot-badge",
} as const;

export const CANDIDATE_TRUST_CENTER_ROUTE = "/dashboard/trust";
export const CANDIDATE_TRUST_CENTER_PROFILE_ALIAS = "/profile/trust";

export const CANDIDATE_TRUST_CENTER_SAFE_LINKS = {
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
  matches: CANDIDATE_CANONICAL_ROUTES.matches,
  profile: CANDIDATE_CANONICAL_ROUTES.profile,
  applications: CANDIDATE_CANONICAL_ROUTES.applications,
  evidence: CANDIDATE_CANONICAL_ROUTES.evidence,
  identity: CANDIDATE_CANONICAL_ROUTES.identity,
  cv: CANDIDATE_CANONICAL_ROUTES.cv,
  plan: CANDIDATE_CANONICAL_ROUTES.plan,
} as const;

export function candidateTrustCenterHref(): string {
  return CANDIDATE_TRUST_CENTER_ROUTE;
}

export function resolveCandidateTrustCenter(candidateId?: string): CandidateTrustCenterRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_TRUST_CENTER_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_TRUST_CENTER_DEMO_ID) {
    return getCandidateTrustCenterDemo();
  }
  return null;
}

export function isCandidateTrustCenterDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_TRUST_CENTER_DEMO_ID;
}
