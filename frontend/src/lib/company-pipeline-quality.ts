export const COMPANY_PIPELINE_SEGMENT_KEYS = [
  "in_review",
  "accepted",
  "invited",
  "rejected",
  "on_hold",
] as const;

export type CompanyPipelineSegmentKey = (typeof COMPANY_PIPELINE_SEGMENT_KEYS)[number];

export type CompanyPipelineSegments = Record<CompanyPipelineSegmentKey, number>;

export type CompanyPipelineRole = {
  role_title: string;
  job_id: number;
  segments: CompanyPipelineSegments;
  total: number;
  average_match_score: number | null;
  missing_data_count: number;
  verification_risk_count: number;
};

export type CompanyPipelineRecruiterActivity = {
  events_last_7_days: number;
  decisions_last_7_days: number;
};

export type CompanyPipelineQualityPayload = {
  company_slug: string;
  source: "workspace";
  generated_at: string;
  total_applications: number;
  company_totals: CompanyPipelineSegments;
  average_match_score: number | null;
  missing_data_count: number;
  verification_risk_count: number;
  roles: CompanyPipelineRole[];
  recruiter_activity: CompanyPipelineRecruiterActivity | null;
};

const FORBIDDEN_PII_KEYS = new Set([
  "email",
  "candidate_name",
  "phone",
  "name",
  "user_id",
  "hashed_password",
]);

export function isCompanyPipelineWorkspaceScoped(payload: CompanyPipelineQualityPayload): boolean {
  return payload.source === "workspace" && Boolean(payload.company_slug?.trim());
}

export function companyPipelinePayloadHasForbiddenPii(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const stack: Record<string, unknown>[] = [value as Record<string, unknown>];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const [key, nested] of Object.entries(current)) {
      if (FORBIDDEN_PII_KEYS.has(key.toLowerCase())) return true;
      if (nested && typeof nested === "object") stack.push(nested as Record<string, unknown>);
    }
  }
  return false;
}

export const COMPANY_PIPELINE_FORBIDDEN_PATTERNS = [
  /time-to-hire/i,
  /time to hire/i,
  /hire conversion/i,
  /conversion rate/i,
  /\b\d+\s*%\s*hire/i,
];
