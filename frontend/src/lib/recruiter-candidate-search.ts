/** Recruiter workspace candidate pool search — filters and PII guard helpers. */

export const RECRUITER_SEARCH_MARKERS = {
  page: "recruiter-search-page",
  searchInput: "recruiter-search-input",
  filtersPanel: "recruiter-search-filters",
  resultCard: "recruiter-search-result-card",
  reviewCardLink: "recruiter-search-review-card-link",
  emptyState: "recruiter-search-empty",
  scopeBanner: "recruiter-search-scope-banner",
} as const;

export const RECRUITER_SEARCH_FORBIDDEN_PII = [
  "email",
  "phone",
  "cv_text",
  "cv_raw",
  "phone_number",
  "@",
] as const;

export type RecruiterSearchFilters = {
  q: string;
  name: string;
  roleTitle: string;
  skills: string;
  location: string;
  minScore: string;
  maxScore: string;
  status: string;
  pipelineStatus: string;
  dataConfidence: string;
  missingData: string;
  availability: string;
};

export const DEFAULT_RECRUITER_SEARCH_FILTERS: RecruiterSearchFilters = {
  q: "",
  name: "",
  roleTitle: "",
  skills: "",
  location: "",
  minScore: "",
  maxScore: "",
  status: "all",
  pipelineStatus: "all",
  dataConfidence: "all",
  missingData: "all",
  availability: "all",
};

export function recruiterSearchQueryParams(
  token: string,
  companySlug: string,
  filters: RecruiterSearchFilters,
): URLSearchParams {
  const params = new URLSearchParams({
    company_slug: companySlug.trim(),
    token: token.trim(),
  });
  const set = (key: string, value: string) => {
    const v = value.trim();
    if (!v || v === "all") return;
    params.set(key, v);
  };
  set("q", filters.q);
  set("name", filters.name);
  set("role_title", filters.roleTitle);
  set("skills", filters.skills);
  set("location", filters.location);
  set("min_score", filters.minScore);
  set("max_score", filters.maxScore);
  set("status", filters.status);
  set("pipeline_status", filters.pipelineStatus);
  set("data_confidence", filters.dataConfidence);
  if (filters.missingData === "yes") params.set("missing_data", "true");
  if (filters.missingData === "no") params.set("missing_data", "false");
  set("availability", filters.availability);
  return params;
}

export function recruiterSearchRowHasForbiddenPii(row: Record<string, unknown>): boolean {
  const blob = JSON.stringify(row).toLowerCase();
  return RECRUITER_SEARCH_FORBIDDEN_PII.some((marker) => blob.includes(marker.toLowerCase()));
}

export function recruiterInboxHighlightHref(applicationId: number): string {
  return `/recruiter/inbox?highlight=${applicationId}`;
}
