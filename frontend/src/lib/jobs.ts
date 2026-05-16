export type JobFilters = {
  q: string;
  location: string;
  job_board: string;
  min_salary: string;
  title_terms: string;
  sort: "newest" | "salary" | "company";
};

export const defaultJobFilters: JobFilters = {
  q: "",
  location: "",
  job_board: "",
  min_salary: "",
  title_terms: "",
  sort: "newest",
};

export function buildJobsQuery(filters: JobFilters, limit = 50): string {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.location.trim()) params.set("location", filters.location.trim());
  if (filters.job_board.trim()) params.set("job_board", filters.job_board.trim());
  if (filters.min_salary.trim()) params.set("min_salary", filters.min_salary.trim());
  if (filters.title_terms.trim()) params.set("title_terms", filters.title_terms.trim());
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  return `?${params.toString()}`;
}
