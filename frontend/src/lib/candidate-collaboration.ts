/** Notes, Feedback, Scorecards & Forms — recruiter/company collaboration layer (pilot). */

import {
  CANDIDATE_COLLABORATION_DEMO_ID,
  getCandidateCollaborationDemo,
  type CandidateCollaborationRecord,
} from "@/lib/candidate-collaboration-demo-data";
import { JOB_PIPELINE_DEMO_ID } from "@/lib/job-pipeline-demo-data";

export { CANDIDATE_COLLABORATION_DEMO_ID };

export const CANDIDATE_COLLABORATION_PAGE_MARKER = "candidate-collaboration-page";

export const CANDIDATE_COLLABORATION_MARKERS = {
  page: CANDIDATE_COLLABORATION_PAGE_MARKER,
  header: "candidate-collaboration-header",
  recruiterNotes: "candidate-collaboration-recruiter-notes",
  hiringFeedback: "candidate-collaboration-hiring-feedback",
  scorecard: "candidate-collaboration-scorecard",
  formsPreview: "candidate-collaboration-forms-preview",
  decisionMemory: "candidate-collaboration-decision-memory",
  boundary: "candidate-collaboration-boundary",
  notFound: "candidate-collaboration-not-found",
  pilotBadge: "candidate-collaboration-pilot-badge",
} as const;

export const RECRUITER_CANDIDATES_ROUTE = "/recruiter/candidates";
export const COMPANY_CANDIDATES_ROUTE = "/company/candidates";
export const RECRUITER_JOBS_ROUTE = "/recruiter/jobs";
export const COMPANY_ROLES_ROUTE = "/company/roles";

export type CandidateCollaborationSurface = "recruiter" | "company";

export type CollaborationView =
  | "collaboration"
  | "notes"
  | "feedback"
  | "scorecard"
  | "job-feedback"
  | "job-scorecards";

export function candidateCollaborationHref(
  candidateId: string,
  surface: CandidateCollaborationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_CANDIDATES_ROUTE : RECRUITER_CANDIDATES_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}/collaboration`;
}

export function candidateNotesHref(
  candidateId: string,
  surface: CandidateCollaborationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_CANDIDATES_ROUTE : RECRUITER_CANDIDATES_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}/notes`;
}

export function candidateFeedbackHref(
  candidateId: string,
  surface: CandidateCollaborationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_CANDIDATES_ROUTE : RECRUITER_CANDIDATES_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}/feedback`;
}

export function candidateScorecardHref(
  candidateId: string,
  surface: CandidateCollaborationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_CANDIDATES_ROUTE : RECRUITER_CANDIDATES_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}/scorecard`;
}

export function jobFeedbackHref(
  jobId: string,
  surface: CandidateCollaborationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
  return `${base}/${encodeURIComponent(jobId)}/feedback`;
}

export function jobScorecardsHref(
  jobId: string,
  surface: CandidateCollaborationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
  return `${base}/${encodeURIComponent(jobId)}/scorecards`;
}

export function resolveCandidateCollaboration(candidateId: string): CandidateCollaborationRecord | null {
  const trimmed = candidateId.trim();
  if (!trimmed) return null;
  if (trimmed === CANDIDATE_COLLABORATION_DEMO_ID) {
    return getCandidateCollaborationDemo();
  }
  return null;
}

export function resolveJobCollaboration(jobId: string): CandidateCollaborationRecord | null {
  const trimmed = jobId.trim();
  if (!trimmed) return null;
  if (trimmed === JOB_PIPELINE_DEMO_ID) {
    return getCandidateCollaborationDemo();
  }
  return null;
}

export function isCandidateCollaborationDemoId(candidateId: string): boolean {
  return candidateId.trim() === CANDIDATE_COLLABORATION_DEMO_ID;
}

export function isJobCollaborationDemoId(jobId: string): boolean {
  return jobId.trim() === JOB_PIPELINE_DEMO_ID;
}
