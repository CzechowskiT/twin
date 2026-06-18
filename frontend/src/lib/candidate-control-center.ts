/** Candidate Control Center — candidate-facing control & transparency actions (pilot). */

import {
  CANDIDATE_CONTROL_CENTER_DEMO_ID,
  getCandidateControlCenterDemo,
  type CandidateControlCenterRecord,
} from "@/lib/candidate-control-center-demo-data";
import { CANDIDATE_CANONICAL_ROUTES } from "@/lib/candidate-canonical-routes";

export { CANDIDATE_CONTROL_CENTER_DEMO_ID };

export const CANDIDATE_CONTROL_CENTER_PAGE_MARKER = "candidate-control-center-page";

export const CANDIDATE_CONTROL_CENTER_MARKERS = {
  page: CANDIDATE_CONTROL_CENTER_PAGE_MARKER,
  header: "candidate-control-center-header",
  visibilityControls: "candidate-control-center-visibility-controls",
  exportPreview: "candidate-control-center-export-preview",
  correctionRequest: "candidate-control-center-correction-request",
  identityVerification: "candidate-control-center-identity-verification",
  dataPortability: "candidate-control-center-data-portability",
  consentReview: "candidate-control-center-consent-review",
  communicationPreferences: "candidate-control-center-communication-preferences",
  appMatchTransparency: "candidate-control-center-app-match-transparency",
  revokeDeletePlanned: "candidate-control-center-revoke-delete-planned",
  trustAuditExport: "candidate-control-center-trust-audit-export",
  trustConsentReceipt: "candidate-control-center-trust-consent-receipt",
  auditTimeline: "candidate-control-center-audit-timeline",
  boundary: "candidate-control-center-boundary",
  notFound: "candidate-control-center-not-found",
  pilotBadge: "candidate-control-center-pilot-badge",
} as const;

export const CANDIDATE_CONTROL_CENTER_ROUTE = "/dashboard/trust/controls";
export const CANDIDATE_CONTROL_CENTER_PROFILE_ALIAS = "/profile/trust/controls";

export const CANDIDATE_CONTROL_CENTER_SAFE_LINKS = {
  trustCenter: CANDIDATE_CANONICAL_ROUTES.trust,
  panel: CANDIDATE_CANONICAL_ROUTES.panel,
  jobs: CANDIDATE_CANONICAL_ROUTES.jobs,
  matches: CANDIDATE_CANONICAL_ROUTES.matches,
  profile: CANDIDATE_CANONICAL_ROUTES.profile,
  gdprConsent: "/consent/gdpr",
} as const;

export function candidateControlCenterHref(): string {
  return CANDIDATE_CONTROL_CENTER_ROUTE;
}

export function resolveCandidateControlCenter(candidateId?: string): CandidateControlCenterRecord | null {
  const trimmed = (candidateId ?? CANDIDATE_CONTROL_CENTER_DEMO_ID).trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_CONTROL_CENTER_DEMO_ID) {
    return getCandidateControlCenterDemo();
  }
  return null;
}

export function isCandidateControlCenterDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_CONTROL_CENTER_DEMO_ID;
}
