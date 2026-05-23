import type { CareerCandidateProfile } from "@/lib/career/candidate-profile-types";
import type { JobListing } from "@/lib/career/job-types";
export type SalaryFit = "above"|"within"|"below"|"unknown";
export function evaluateSalaryFit(job: JobListing, profile: CareerCandidateProfile | null | undefined): SalaryFit {
  const desired = profile?.desiredSalary; if (!desired || job.salaryMax == null) return "unknown";
  if (job.salaryMin != null && desired < job.salaryMin) return "below";
  if (desired > job.salaryMax) return "above"; return "within";
}
export function formatSalaryRange(job: JobListing): string {
  const { salaryMin, salaryMax, salaryCurrency, salaryPeriod } = job;
  if (salaryMin == null && salaryMax == null) return "—";
  const fmt = (n: number) => n.toLocaleString();
  const range = salaryMin != null && salaryMax != null ? `${fmt(salaryMin)}–${fmt(salaryMax)}` : salaryMax != null ? `≤ ${fmt(salaryMax)}` : `≥ ${fmt(salaryMin!)}`;
  const period = salaryPeriod === "yearly" ? "yr" : salaryPeriod === "hourly" ? "hr" : "mo";
  return `${range} ${salaryCurrency}/${period}`;
}
