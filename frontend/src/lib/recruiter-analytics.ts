/** Recruiter analytics payload types — workspace-scoped, no PII. */

export type RecruiterAnalyticsPayload = {
  company_slug: string;
  source: string;
  generated_at: string;
  window_days: number;
  inbox: {
    in_review: number;
    accepted: number;
    rejected: number;
    total_tracked: number;
  };
  pipeline_stages: Record<string, number>;
  activity: {
    audit_events_7d: number;
    decisions_logged_7d: number;
  };
  readiness: {
    export_live: boolean;
    bi_live: boolean;
  };
};

export const RECRUITER_ANALYTICS_ROUTE = "/recruiter/analytics";
