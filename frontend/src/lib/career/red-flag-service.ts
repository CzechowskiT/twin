import type { JobListing } from "@/lib/career/job-types";
const SUSPICIOUS = [/rockstar/i,/ninja/i,/unpaid/i,/commission only/i,/prowizj/i];
export function detectRedFlags(job: JobListing): string[] {
  const flags = [...(job.redFlags ?? [])]; const text = `${job.title} ${job.description ?? ""}`;
  for (const p of SUSPICIOUS) if (p.test(text)) flags.push(`pattern:${p.source}`);
  if (job.salaryMin == null && job.salaryMax == null) flags.push("no_salary_disclosed");
  if (job.skills.length > 15) flags.push("skill_sprawl");
  return [...new Set(flags)];
}
