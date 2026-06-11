/** Candidate application timeline CRM — types for /dashboard/applications. */

export type CandidateTimelineItem = {
  id: number;
  title: string;
  company: string;
  status: string;
  display_status?: string | null;
  submission_status?: string | null;
  updated_at: string;
  applied_at?: string | null;
  url: string;
};

export const CANDIDATE_TIMELINE_ROUTE = "/dashboard/applications";

export function formatTimelinePhase(item: CandidateTimelineItem): string {
  return item.display_status || item.submission_status || item.status;
}
