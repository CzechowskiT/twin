import type { JobListing } from "@/lib/career/job-types";
export type ApiJobRow = { id: number; job_board: string; title: string; company: string; location: string | null;
  salary_min: number | null; salary_max: number | null; salary_currency: string; skills: string[]; url: string;
  scraped_at: string; is_validated?: boolean; description?: string | null; };
export function apiJobToListing(row: ApiJobRow): JobListing {
  return { id: String(row.id), jobBoard: row.job_board, title: row.title, company: row.company,
    location: row.location, city: row.location?.split(",")[0]?.trim() ?? null,
    salaryMin: row.salary_min, salaryMax: row.salary_max, salaryCurrency: row.salary_currency || "PLN",
    salaryPeriod: "monthly", skills: row.skills ?? [], description: row.description, url: row.url,
    scrapedAt: row.scraped_at, isValidated: row.is_validated };
}
