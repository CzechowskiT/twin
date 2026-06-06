/** Recruiter inbox PII visibility metadata (mirrors backend inbox row shape). */

export type RecruiterDataVisibility = {
  data_visibility_context?: string | null;
  data_visibility_summary?: string | null;
  candidate_data_visible?: string[] | null;
  candidate_data_hidden?: string[] | null;
  consent_receipt_available?: boolean;
  pii_context?: string | null;
};

/** Prefer API summary; fall back to i18n key when row predates metadata. */
export function recruiterDataVisibilitySummary(row: RecruiterDataVisibility): string | null {
  const summary = (row.data_visibility_summary ?? "").trim();
  return summary || null;
}

export function recruiterDataVisibilityContext(row: RecruiterDataVisibility): string {
  return (row.data_visibility_context ?? row.pii_context ?? "").trim();
}
