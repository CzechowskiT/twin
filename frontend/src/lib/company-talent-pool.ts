/** Company talent pool — organizational talent memory (no PII). */

import {
  RECRUITER_TALENT_POOL_FORBIDDEN_PII,
  type TalentPoolPayload,
  type TalentPoolRecord,
} from "@/lib/recruiter-talent-pool";

export const COMPANY_TALENT_POOL_ROUTE = "/company/talent-pool";

export const COMPANY_TALENT_POOL_MARKERS = {
  page: "company-talent-pool-page",
  summaryPanel: "company-talent-pool-summary-panel",
  qualityPanel: "company-talent-pool-quality-panel",
  roleSkillCoverage: "company-talent-pool-role-skill-coverage",
  readinessPanel: "company-talent-pool-readiness-panel",
  sourceCoverage: "company-talent-pool-source-coverage",
  recordsList: "company-talent-pool-records-list",
  emptyState: "company-talent-pool-empty",
  importLink: "company-talent-pool-import-link",
  integrationsLink: "company-talent-pool-integrations-link",
  pipelineLink: "company-talent-pool-pipeline-link",
  radarLink: "company-talent-pool-radar-link",
} as const;

export const COMPANY_TALENT_POOL_READINESS_STATES = [
  "ready",
  "needs_enrichment",
  "duplicate_review",
  "consent_required",
  "stale",
] as const;

export type CompanyTalentPoolReadinessState = (typeof COMPANY_TALENT_POOL_READINESS_STATES)[number];

export const COMPANY_TALENT_POOL_FORBIDDEN_COPY = [
  /\blinkedin\b/i,
  /\bautomatically contact\b/i,
  /\bauto.*outreach enabled\b/i,
  /\blive ats sync enabled\b/i,
] as const;

export type CompanyTalentPoolExecutiveSummary = {
  known_candidates: number;
  imported_candidates: number;
  radar_ready: number;
  data_gaps: number;
  potential_duplicates: number;
  active_sources: number;
  planned_sources: number;
};

export type CompanyTalentPoolDataQualityDimensions = {
  missing_role_title?: number;
  missing_skills?: number;
  missing_location?: number;
  missing_seniority?: number;
  low_evidence?: number;
  missing_consent?: number;
  stale_records?: number;
  duplicates?: number;
};

export type CompanyTalentPoolRoleSkillCoverage = {
  top_roles: { title: string; count: number }[];
  top_skills: { skill: string; count: number }[];
  weak_coverage: {
    role_title: string;
    candidate_count: number;
    gap_count: number;
    coverage_warning: string;
    job_id?: number | null;
    suggested_action: string;
  }[];
  suggested_actions: { code: string; label: string; href: string }[];
};

export type CompanyTalentPoolReadinessCandidate = {
  id: number;
  display_name: string;
  job_title: string | null;
  readiness_state: CompanyTalentPoolReadinessState;
  radar_href: string;
};

export type CompanyTalentPoolPayload = TalentPoolPayload & {
  source: string;
  generated_at: string;
  executive_summary: CompanyTalentPoolExecutiveSummary;
  data_quality: TalentPoolPayload["data_quality"] & {
    dimensions: CompanyTalentPoolDataQualityDimensions;
  };
  role_skill_coverage: CompanyTalentPoolRoleSkillCoverage;
  readiness: {
    counts: Record<CompanyTalentPoolReadinessState, number>;
    candidates: CompanyTalentPoolReadinessCandidate[];
  };
  source_coverage: TalentPoolPayload["source_coverage"] & {
    applications: number;
    inbox: number;
    scorecards: number;
    notes: number;
    import_pool: number;
    ats_connectors_planned: boolean;
  };
  links: {
    recruiter_import: string;
    integrations: string;
    pipeline: string;
    recruiter_pool: string;
    talent_radar: string;
  };
};

export function companyTalentPoolRadarHref(jobId?: number | string | null): string {
  if (jobId != null && String(jobId).trim()) {
    return `/recruiter/talent-radar?role_id=${String(jobId).trim()}`;
  }
  return "/recruiter/talent-radar";
}

export function isCompanyTalentPoolWorkspaceScoped(payload: CompanyTalentPoolPayload): boolean {
  return payload.source === "workspace" && Boolean(payload.company_slug?.trim());
}

export function companyTalentPoolPayloadHasForbiddenPii(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const blob = JSON.stringify(payload).toLowerCase();
  return RECRUITER_TALENT_POOL_FORBIDDEN_PII.some((marker) => blob.includes(marker));
}

export function companyTalentPoolRecordIsSafe(record: TalentPoolRecord): boolean {
  return !companyTalentPoolPayloadHasForbiddenPii(record);
}

export function companyTalentPoolRadarHrefIsRoleAware(href: string): boolean {
  return href.includes("role_id=");
}
