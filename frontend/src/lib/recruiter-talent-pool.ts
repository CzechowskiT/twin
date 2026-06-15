export const RECRUITER_TALENT_POOL_ROUTE = "/recruiter/talent-pool";
export const RECRUITER_TALENT_POOL_IMPORT_ROUTE = "/recruiter/talent-pool/import";

export const RECRUITER_TALENT_POOL_MARKERS = {
  page: "recruiter-talent-pool-page",
  summaryPanel: "recruiter-talent-pool-summary-panel",
  qualityPanel: "recruiter-talent-pool-quality-panel",
  sourceCoverage: "recruiter-talent-pool-source-coverage",
  recordsList: "recruiter-talent-pool-records-list",
  emptyState: "recruiter-talent-pool-empty",
  importLink: "recruiter-talent-pool-import-link",
  importPage: "recruiter-talent-pool-import-page",
  csvPaste: "recruiter-talent-pool-csv-paste",
  previewPanel: "recruiter-talent-pool-preview-panel",
  commitButton: "recruiter-talent-pool-commit-button",
  resultPanel: "recruiter-talent-pool-result-panel",
} as const;

export const RECRUITER_TALENT_POOL_FORBIDDEN_PII = [
  "email",
  "phone",
  "cv_text",
  "cv_raw",
  "phone_number",
  "@",
  "linkedin",
] as const;

export const TALENT_POOL_CSV_TEMPLATE = `display_name,job_title,skills,location,seniority,external_ats_id,candidate_id,pipeline_status
Alex Kowalski,Senior Backend Engineer,Python;FastAPI;PostgreSQL,Warsaw,senior,ATS-1001,CAND-42,review
`;

export type TalentPoolDataQuality = {
  score?: number;
  level?: "high" | "medium" | "low";
  warnings?: string[];
};

export type TalentPoolRecord = {
  id: number;
  display_name: string;
  job_title?: string | null;
  location?: string | null;
  seniority?: string | null;
  skills?: string[];
  data_quality?: TalentPoolDataQuality;
  external_ats_id?: string | null;
  candidate_id?: string | null;
  application_id?: number | null;
  pipeline_status?: string | null;
  source?: string;
  created_at?: string | null;
};

export type TalentPoolSummary = {
  total_records: number;
  shown: number;
  quality_high: number;
  quality_medium: number;
  quality_low: number;
  import_batches: number;
  last_import_at?: string | null;
  last_import_status?: string | null;
};

export type TalentPoolPayload = {
  company_slug: string;
  summary: TalentPoolSummary;
  data_quality: {
    levels: Record<string, number>;
    top_warnings: { code: string; count: number }[];
  };
  source_coverage: {
    imported_internal_pool: number;
    import_sources: Record<string, number>;
    external_sourcing: boolean;
    live_ats_sync: boolean;
  };
  items: TalentPoolRecord[];
  scope_note: string;
};

export type TalentPoolPreviewRow = {
  row_index: number;
  display_name: string;
  job_title?: string | null;
  location?: string | null;
  skills?: string[];
  status: "ready" | "duplicate" | "error";
  data_quality?: TalentPoolDataQuality;
  duplicate_key?: string;
};

export type TalentPoolPreviewPayload = {
  import_id: number;
  company_slug: string;
  status: string;
  summary: { total: number; ready: number; duplicates: number; errors: number };
  warnings: string[];
  rows: TalentPoolPreviewRow[];
};

export type TalentPoolCommitPayload = {
  import_id: number;
  company_slug: string;
  status: string;
  summary: { accepted: number; duplicates_skipped: number; total_previewed: number };
};

export function talentPoolRowHasForbiddenPii(row: Record<string, unknown>): boolean {
  const blob = JSON.stringify(row).toLowerCase();
  return RECRUITER_TALENT_POOL_FORBIDDEN_PII.some((marker) => blob.includes(marker));
}

export function talentPoolImportQuery(token: string, companySlug: string): string {
  return new URLSearchParams({ token, company_slug: companySlug }).toString();
}
