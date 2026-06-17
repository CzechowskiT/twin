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
