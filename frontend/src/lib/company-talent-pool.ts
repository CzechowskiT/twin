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
  sourceCoverage: "company-talent-pool-source-coverage",
  recordsList: "company-talent-pool-records-list",
  emptyState: "company-talent-pool-empty",
  importLink: "company-talent-pool-import-link",
  integrationsLink: "company-talent-pool-integrations-link",
  pipelineLink: "company-talent-pool-pipeline-link",
} as const;

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
  missing_consent?: number;
  stale_records?: number;
  duplicates?: number;
};

export type CompanyTalentPoolPayload = TalentPoolPayload & {
  source: string;
  generated_at: string;
  executive_summary: CompanyTalentPoolExecutiveSummary;
  data_quality: TalentPoolPayload["data_quality"] & {
    dimensions: CompanyTalentPoolDataQualityDimensions;
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
  };
};

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
