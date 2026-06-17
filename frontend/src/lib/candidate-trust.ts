/** GDPR / Consent / Contact History — recruiter/company trust layer (pilot). */

import {
  CANDIDATE_TRUST_DEMO_ID,
  getCandidateTrustDemo,
  type CandidateTrustRecord,
} from "@/lib/candidate-trust-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export { CANDIDATE_TRUST_DEMO_ID };

export const CANDIDATE_TRUST_PAGE_MARKER = "candidate-trust-page";

export const CANDIDATE_TRUST_MARKERS = {
  page: CANDIDATE_TRUST_PAGE_MARKER,
  header: "candidate-trust-header",
  consentStatus: "candidate-trust-consent-status",
  dataSource: "candidate-trust-data-source",
  contactPermission: "candidate-trust-contact-permission",
  contactHistory: "candidate-trust-contact-history",
  retentionReview: "candidate-trust-retention-review",
  riskFlags: "candidate-trust-risk-flags",
  boundary: "candidate-trust-boundary",
  auditConnections: "candidate-trust-audit-connections",
  notFound: "candidate-trust-not-found",
  pilotBadge: "candidate-trust-pilot-badge",
} as const;

export const RECRUITER_CANDIDATES_ROUTE = "/recruiter/candidates";
export const COMPANY_CANDIDATES_ROUTE = "/company/candidates";
export const RECRUITER_JOBS_ROUTE = "/recruiter/jobs";
export const COMPANY_ROLES_ROUTE = "/company/roles";

export type CandidateTrustSurface = "recruiter" | "company";

export type TrustView = "trust" | "consent" | "contact-history" | "job-consent";

export function candidateTrustHref(
  candidateId: string,
  surface: CandidateTrustSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_CANDIDATES_ROUTE : RECRUITER_CANDIDATES_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}/trust`;
}

export function candidateConsentHref(
  candidateId: string,
  surface: CandidateTrustSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_CANDIDATES_ROUTE : RECRUITER_CANDIDATES_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}/consent`;
}

export function candidateContactHistoryHref(
  candidateId: string,
  surface: CandidateTrustSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_CANDIDATES_ROUTE : RECRUITER_CANDIDATES_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}/contact-history`;
}

export function jobConsentHref(
  jobId: string,
  surface: CandidateTrustSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
  return `${base}/${encodeURIComponent(jobId)}/consent`;
}

export function resolveCandidateTrust(candidateId: string): CandidateTrustRecord | null {
  const trimmed = candidateId.trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_TRUST_DEMO_ID) {
    return getCandidateTrustDemo();
  }
  return null;
}

export function resolveJobTrust(jobId: string): CandidateTrustRecord | null {
  const trimmed = jobId.trim();
  if (!trimmed) return null;
  if (trimmed === JOB_PIPELINE_DEMO_ID) {
    return getCandidateTrustDemo();
  }
  return null;
}

export function isCandidateTrustDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_TRUST_DEMO_ID;
}

export function isJobTrustDemoId(jobId: string): boolean {
  return jobId.trim() === JOB_PIPELINE_DEMO_ID;
}
