/** Candidate Profile 360 — recruiter/company system-of-record surface (pilot). */

import {
  CANDIDATE_PROFILE_360_DEMO_ID,
  getCandidateProfile360Demo,
  type CandidateProfile360Record,
} from "@/lib/candidate-profile-360-demo-data";

export { CANDIDATE_PROFILE_360_DEMO_ID };

export const CANDIDATE_PROFILE_360_PAGE_MARKER = "candidate-profile-360-page";

export const CANDIDATE_PROFILE_360_MARKERS = {
  page: CANDIDATE_PROFILE_360_PAGE_MARKER,
  header: "candidate-profile-360-header",
  profileSummary: "candidate-profile-360-profile-summary",
  cvDocuments: "candidate-profile-360-cv-documents",
  applications: "candidate-profile-360-applications",
  matches: "candidate-profile-360-matches",
  notes: "candidate-profile-360-notes",
  feedback: "candidate-profile-360-feedback",
  consent: "candidate-profile-360-consent",
  decisionMemory: "candidate-profile-360-decision-memory",
  activity: "candidate-profile-360-activity",
  boundary: "candidate-profile-360-boundary",
  notFound: "candidate-profile-360-not-found",
  pilotBadge: "candidate-profile-360-pilot-badge",
} as const;

export const RECRUITER_CANDIDATE_PROFILE_360_ROUTE = "/recruiter/candidates";
export const COMPANY_CANDIDATE_PROFILE_360_ROUTE = "/company/candidates";

export type CandidateProfile360Surface = "recruiter" | "company";

export function candidateProfile360Href(
  candidateId: string,
  surface: CandidateProfile360Surface = "recruiter",
): string {
  const base =
    surface === "company" ? COMPANY_CANDIDATE_PROFILE_360_ROUTE : RECRUITER_CANDIDATE_PROFILE_360_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}`;
}

export function resolveCandidateProfile360(candidateId: string): CandidateProfile360Record | null {
  const trimmed = candidateId.trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_PROFILE_360_DEMO_ID) {
    return getCandidateProfile360Demo();
  }
  return null;
}

export function isCandidateProfile360DemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_PROFILE_360_DEMO_ID;
}
