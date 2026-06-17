/** Team Collaboration — recruiter/company shared workspace layer (pilot). */

import {
  getCandidateTeamCollaborationDemo,
  getJobTeamCollaborationDemo,
  TEAM_COLLABORATION_CANDIDATE_DEMO_ID,
  TEAM_COLLABORATION_ROLE_DEMO_ID,
  type CandidateTeamCollaborationRecord,
  type JobTeamCollaborationRecord,
} from "@/lib/team-collaboration-demo-data";

export {
  TEAM_COLLABORATION_CANDIDATE_DEMO_ID,
  TEAM_COLLABORATION_ROLE_DEMO_ID,
};

export const TEAM_COLLABORATION_PAGE_MARKER = "team-collaboration-page";

export const TEAM_COLLABORATION_MARKERS = {
  page: TEAM_COLLABORATION_PAGE_MARKER,
  header: "team-collaboration-header",
  activityTimeline: "team-collaboration-activity-timeline",
  assignments: "team-collaboration-assignments",
  followUpTasks: "team-collaboration-follow-up-tasks",
  openQuestions: "team-collaboration-open-questions",
  decisionChecklist: "team-collaboration-decision-checklist",
  boundary: "team-collaboration-boundary",
  auditConnections: "team-collaboration-audit-connections",
  notFound: "team-collaboration-not-found",
  pilotBadge: "team-collaboration-pilot-badge",
} as const;

export const RECRUITER_CANDIDATES_ROUTE = "/recruiter/candidates";
export const COMPANY_CANDIDATES_ROUTE = "/company/candidates";
export const RECRUITER_JOBS_ROUTE = "/recruiter/jobs";
export const COMPANY_ROLES_ROUTE = "/company/roles";

export type TeamCollaborationSurface = "recruiter" | "company";

export type TeamCollaborationView = "team" | "tasks";

export function candidateTeamHref(
  candidateId: string,
  surface: TeamCollaborationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_CANDIDATES_ROUTE : RECRUITER_CANDIDATES_ROUTE;
  return `${base}/${encodeURIComponent(candidateId)}/team`;
}

export function jobTeamHref(
  jobId: string,
  surface: TeamCollaborationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
  return `${base}/${encodeURIComponent(jobId)}/team`;
}

export function jobTasksHref(
  jobId: string,
  surface: TeamCollaborationSurface = "recruiter",
): string {
  const base = surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
  return `${base}/${encodeURIComponent(jobId)}/tasks`;
}

export function jobsListHref(surface: TeamCollaborationSurface = "recruiter"): string {
  return surface === "company" ? COMPANY_ROLES_ROUTE : RECRUITER_JOBS_ROUTE;
}

export function resolveCandidateTeamCollaboration(
  candidateId: string,
): CandidateTeamCollaborationRecord | null {
  const trimmed = candidateId.trim();
  if (!trimmed) return null;
  if (trimmed === TEAM_COLLABORATION_CANDIDATE_DEMO_ID) {
    return getCandidateTeamCollaborationDemo();
  }
  return null;
}

export function resolveJobTeamCollaboration(jobId: string): JobTeamCollaborationRecord | null {
  const trimmed = jobId.trim();
  if (!trimmed) return null;
  if (trimmed === TEAM_COLLABORATION_ROLE_DEMO_ID) {
    return getJobTeamCollaborationDemo();
  }
  return null;
}

export function isCandidateTeamCollaborationDemoId(candidateId: string): boolean {
  return candidateId.trim() === TEAM_COLLABORATION_CANDIDATE_DEMO_ID;
}

export function isJobTeamCollaborationDemoId(jobId: string): boolean {
  return jobId.trim() === TEAM_COLLABORATION_ROLE_DEMO_ID;
}
