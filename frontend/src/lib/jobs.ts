import { safeStorage } from "@/lib/safe-storage";

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

const JOB_FILTERS_STORAGE_KEY = "twin_dashboard_job_filters_v1";

/** In-memory fallback when both Web Storage APIs are blocked (IT policy / private mode). */
let memoryJobFiltersJson: string | null = null;

function readJobFilterString(): string | null {
  if (typeof window === "undefined") return null;
  const fromLocal = safeStorage.getItem(JOB_FILTERS_STORAGE_KEY);
  if (fromLocal?.trim()) return fromLocal;
  try {
    const fromSession = sessionStorage.getItem(JOB_FILTERS_STORAGE_KEY);
    if (fromSession?.trim()) return fromSession;
  } catch {
    return memoryJobFiltersJson;
  }
  return memoryJobFiltersJson;
}

function writeJobFilterString(value: string): void {
  if (typeof window === "undefined") return;
  memoryJobFiltersJson = value;
  if (safeStorage.setItem(JOB_FILTERS_STORAGE_KEY, value)) {
    return;
  }
  console.warn("localStorage not available for job filters; using sessionStorage");
  try {
    sessionStorage.setItem(JOB_FILTERS_STORAGE_KEY, value);
  } catch {
    console.warn("sessionStorage not available for job filters; using in-memory fallback only");
  }
}

function isJobSort(v: unknown): v is JobFilters["sort"] {
  return v === "newest" || v === "salary" || v === "company";
}

/** Restore dashboard job filters from localStorage (browser only). */
export function loadStoredJobFilters(): JobFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readJobFilterString();
    if (!raw?.trim()) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const sort = o.sort;
    return {
      q: typeof o.q === "string" ? o.q : "",
      location: typeof o.location === "string" ? o.location : "",
      job_board: typeof o.job_board === "string" ? o.job_board : "",
      min_salary: typeof o.min_salary === "string" ? o.min_salary : "",
      title_terms: typeof o.title_terms === "string" ? o.title_terms : "",
      sort: isJobSort(sort) ? sort : "newest",
    };
  } catch {
    return null;
  }
}

export function persistJobFilters(filters: JobFilters): void {
  writeJobFilterString(JSON.stringify(filters));
}
