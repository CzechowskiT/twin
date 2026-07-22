/** Recruiter SLA tracking — live targets + breach summary from workspace API. */

export type RecruiterSlaStageBucket = {
  open: number;
  breached: number;
};

export type RecruiterSlaBreach = {
  application_id: number;
  stage_key: string;
  age_hours: number;
  target_hours: number;
  breached: boolean;
  job_id?: number;
};

export type RecruiterSlaSummary = {
  company_slug: string;
  source?: string;
  generated_at?: string;
  targets: { stage_key: string; target_hours: number; source?: string }[];
  by_stage: Record<string, RecruiterSlaStageBucket>;
  open_count: number;
  breach_count: number;
  breaches?: RecruiterSlaBreach[];
  sample_metrics?: boolean;
};

export const RECRUITER_SLA_API_PATH = "/api/recruiter/sla";

export const RECRUITER_SLA_MARKERS = {
  panel: "recruiter-analytics-sla-panel",
  breachCount: "recruiter-analytics-sla-breaches",
  openCount: "recruiter-analytics-sla-open",
} as const;
