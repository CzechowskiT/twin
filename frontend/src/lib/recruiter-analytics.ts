/** Recruiter analytics — workspace read-only aggregates. */

export type RecruiterAnalyticsPayload = {
  company_slug: string;
  source: string;
  generated_at: string;
  window_days: number;
  applications_total: number;
  applications_by_status: Record<string, number>;
  audit_events_total: number;
  audit_decisions: number;
  audit_reviews_opened: number;
  calendar_sync_live: boolean;
  readiness: { public_launch: boolean; analytics_export: boolean };
};

export type RecruiterAnalyticsSummary = {
  activeRoles: number;
  candidatesReviewed: number;
  shortlistReady: number;
  pipelineHealthPct: number;
  nextActionKey: "review_inbox" | "advance_pipeline" | "publish_role" | "all_clear";
  statusRows: { status: string; count: number }[];
};

const SHORTLIST_STATUS_KEYS = [
  "shortlisted",
  "accepted",
  "invited",
  "interview",
  "scheduled",
] as const;

export function deriveRecruiterAnalyticsSummary(
  payload: RecruiterAnalyticsPayload,
  activeRoles: number,
): RecruiterAnalyticsSummary {
  const byStatus = payload.applications_by_status ?? {};
  const statusRows = Object.entries(byStatus)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const shortlistReady = statusRows
    .filter(({ status }) =>
      SHORTLIST_STATUS_KEYS.some((key) => status.toLowerCase().includes(key)),
    )
    .reduce((sum, row) => sum + row.count, 0);

  const total = payload.applications_total;
  const decided = payload.audit_decisions;
  const pipelineHealthPct = total > 0 ? Math.round((decided / total) * 100) : 0;

  let nextActionKey: RecruiterAnalyticsSummary["nextActionKey"] = "all_clear";
  if (total === 0 && activeRoles === 0) nextActionKey = "publish_role";
  else if (payload.audit_reviews_opened < total && total > 0) nextActionKey = "review_inbox";
  else if (shortlistReady > 0 && decided < total) nextActionKey = "advance_pipeline";

  return {
    activeRoles,
    candidatesReviewed: payload.audit_reviews_opened,
    shortlistReady,
    pipelineHealthPct,
    nextActionKey,
    statusRows,
  };
}

export const RECRUITER_ANALYTICS_ROUTE = "/recruiter/analytics";

export const RECRUITER_ANALYTICS_PAGE_MARKER = "recruiter-analytics-page";

export const RECRUITER_ANALYTICS_MARKERS = {
  page: RECRUITER_ANALYTICS_PAGE_MARKER,
  loadButton: "recruiter-analytics-load",
  accessFields: "recruiter-analytics-access-fields",
} as const;

export function isRecruiterAnalyticsWorkspaceScoped(p: RecruiterAnalyticsPayload): boolean {
  return p.source === "workspace" && Boolean(p.company_slug?.trim());
}
