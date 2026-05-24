import { deterministicAiService } from "@/lib/career/ai-service";
import type { CareerCandidateProfile } from "@/lib/career/candidate-profile-types";
import { computeMatchScore } from "@/lib/career/match-score-service";
import type { JobListing, JobSearchFilters } from "@/lib/career/job-types";

function enrichJob(
  job: JobListing,
  profile?: CareerCandidateProfile | null,
): JobListing {
  const { score, band } = computeMatchScore(job, profile);
  return { ...job, matchScore: score, matchBand: band };
}

function matchesNeedle(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

function minSalaryOk(job: JobListing, minSalary: string): boolean {
  const min = Number.parseInt(minSalary, 10);
  if (!Number.isFinite(min) || min <= 0) return true;
  if (job.salaryMax == null && job.salaryMin == null) return true;
  const top = job.salaryMax ?? job.salaryMin ?? 0;
  return top >= min;
}

function sortJobs(list: JobListing[], sort: JobSearchFilters["sort"]): JobListing[] {
  const copy = [...list];
  if (sort === "match") {
    copy.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    return copy;
  }
  if (sort === "salary") {
    copy.sort((a, b) => (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0));
    return copy;
  }
  if (sort === "company") {
    copy.sort((a, b) => a.company.localeCompare(b.company));
    return copy;
  }
  copy.sort((a, b) => (b.scrapedAt ?? "").localeCompare(a.scrapedAt ?? ""));
  return copy;
}

export function filterJobs(
  jobs: JobListing[],
  filters: JobSearchFilters,
  profile?: CareerCandidateProfile | null,
): JobListing[] {
  let list = jobs.map((job) => enrichJob(job, profile));
  list = list.filter((job) => {
    const blob = `${job.title} ${job.company} ${job.description ?? ""} ${job.skills.join(" ")}`;
    if (!matchesNeedle(blob, filters.q)) return false;
    if (!matchesNeedle(job.location ?? "", filters.location)) return false;
    if (!matchesNeedle(job.jobBoard, filters.jobBoard)) return false;
    if (!matchesNeedle(job.department ?? "", filters.department)) return false;
    if (!matchesNeedle(job.workFormat ?? "", filters.workFormat)) return false;
    if (!matchesNeedle(job.seniority ?? "", filters.seniority)) return false;
    if (filters.skills.trim() && !filters.skills.split(",").every((s) => matchesNeedle(blob, s))) {
      return false;
    }
    return minSalaryOk(job, filters.minSalary);
  });
  return sortJobs(list, filters.sort);
}

export function groupJobsByCity(jobs: JobListing[]): Record<string, JobListing[]> {
  const out: Record<string, JobListing[]> = {};
  for (const job of jobs) {
    const city = job.city ?? job.location?.split(",")[0]?.trim() ?? "Unknown";
    if (!out[city]) out[city] = [];
    out[city].push(job);
  }
  return out;
}

export async function parseNaturalLanguageSearch(
  query: string,
): Promise<Partial<JobSearchFilters>> {
  const partial = await deterministicAiService.parseNaturalLanguageQuery(query);
  return {
    q: partial.q,
    location: partial.location,
    workFormat: partial.workFormat,
    seniority: partial.seniority,
    minSalary: partial.minSalary,
  };
}
