/** Candidate role status — safe pipeline persistence preview. */

export const CANDIDATE_ROLE_STATUS_RECRUITER_ROUTE = "/recruiter/candidate-role-status";
export const CANDIDATE_ROLE_STATUS_COMPANY_ROUTE = "/company/candidate-role-status";
export const CANDIDATE_ROLE_STATUS_PAGE_MARKER = "candidate-role-status-page";
export const CANDIDATE_ROLE_STATUS_MARKERS = {
  page: CANDIDATE_ROLE_STATUS_PAGE_MARKER,
  header: "candidate-role-status-header",
  board: "candidate-role-status-board",
  boundary: "candidate-role-status-boundary",
} as const;
export const SAFE_STATUSES = ["new", "reviewed", "shortlisted", "needs_feedback", "waiting_candidate", "paused"] as const;
