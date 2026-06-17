/** Safe Email Communication — draft-only layer (pilot). */

import {
  getCandidateSafeCommunicationDemo,
  getJobSafeCommunicationDemo,
  SAFE_COMMUNICATION_CANDIDATE_DEMO_ID,
  SAFE_COMMUNICATION_ROLE_DEMO_ID,
  type CandidateSafeCommunicationRecord,
  type JobSafeCommunicationRecord,
} from "@/lib/safe-communication-demo-data";

export {
  SAFE_COMMUNICATION_CANDIDATE_DEMO_ID,
  SAFE_COMMUNICATION_ROLE_DEMO_ID,
};

export const SAFE_COMMUNICATION_PAGE_MARKER = "safe-communication-page";

export const SAFE_COMMUNICATION_MARKERS = {
  page: SAFE_COMMUNICATION_PAGE_MARKER,
  header: "safe-communication-header",
  consentWarning: "safe-communication-consent-warning",
  draftLibrary: "safe-communication-draft-library",
  draftPreview: "safe-communication-draft-preview",
  actions: "safe-communication-actions",
  internalUpdate: "safe-communication-internal-update",
  communicationAudit: "safe-communication-audit",
  humanDecisionBoundary: "safe-communication-human-decision-boundary",
  notFound: "safe-communication-not-found",
  pilotBadge: "safe-communication-pilot-badge",
} as const;

export const RECRUITER_CANDIDATES_ROUTE = "/recruiter/candidates";
export const COMPANY_CANDIDATES_ROUTE = "/company/candidates";
export const RECRUITER_JOBS_ROUTE = "/recruiter/jobs";
export const COMPANY_ROLES_ROUTE = "/company/roles";

export type SafeCommunicationSurface = "recruiter" | "company";

export type SafeCommunicationView = "communication" | "drafts";

export function candidateCommunicationHref(
  candidateId: string,
  surface: SafeCommunicationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_CANDIDATES_ROUTE : RECRUITER_CANDIDATES_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}/communication`;
}

export function jobCommunicationHref(
  jobId: string,
  surface: SafeCommunicationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
  return `${base}/${encodeURIComponent(jobId)}/communication`;
}

export function jobDraftsHref(
  jobId: string,
  surface: SafeCommunicationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
  return `${base}/${encodeURIComponent(jobId)}/drafts`;
}

export function jobsListHref(surface: SafeCommunicationSurface = "recruiter"): string {
  return surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
}

export function resolveCandidateSafeCommunication(
  candidateId: string,
): CandidateSafeCommunicationRecord | null {
  const trimmed = candidateId.trim();
  if (!trimmed) return null;
  if (trimmed === SAFE_COMMUNICATION_CANDIDATE_DEMO_ID) {
    return getCandidateSafeCommunicationDemo();
  }
  return null;
}

export function resolveJobSafeCommunication(jobId: string): JobSafeCommunicationRecord | null {
  const trimmed = jobId.trim();
  if (!trimmed) return null;
  if (trimmed === SAFE_COMMUNICATION_ROLE_DEMO_ID) {
    return getJobSafeCommunicationDemo();
  }
  return null;
}

export function isCandidateSafeCommunicationDemoId(candidateId: string): boolean {
  return candidateId.trim() === SAFE_COMMUNICATION_CANDIDATE_DEMO_ID;
}

export function isJobSafeCommunicationDemoId(jobId: string): boolean {
  return jobId.trim() === SAFE_COMMUNICATION_ROLE_DEMO_ID;
}
