"use client";

import { MatchScoreBadge } from "@/components/career/match-score-badge";
import { SalaryBadge } from "@/components/career/salary-badge";
import { SkillTags } from "@/components/career/skill-tags";
import { computeMatchScore } from "@/lib/career/match-score-service";
import type { CareerCandidateProfile } from "@/lib/career/candidate-profile-types";
import type { JobListing } from "@/lib/career/job-types";

export function JobCard({
  job,
  profile,
  selected,
  onSelect,
}: {
  job: JobListing;
  profile?: CareerCandidateProfile | null;
  selected?: boolean;
  onSelect: (job: JobListing) => void;
}) {
  const match = computeMatchScore(job, profile);
  const enriched = { ...job, matchScore: match.score, matchBand: match.band };
  return (
    <button
      type="button"
      onClick={() => onSelect(enriched)}
      className={
        "twin-job-row w-full rounded-lg border border-transparent p-3 text-left transition " +
        (selected ? "border-[var(--twin-accent)] ring-1 ring-[var(--twin-accent)]" : "hover:border-[var(--twin-border)]")
      }
    >
      <div className="flex justify-between gap-2">
        <div>
          <p className="font-medium">{job.title}</p>
          <p className="twin-muted text-xs">
            {job.company} · {job.location ?? "—"}
          </p>
        </div>
        <MatchScoreBadge score={enriched.matchScore} band={enriched.matchBand} />
      </div>
      <div className="mt-2">
        <SalaryBadge job={job} profile={profile} />
      </div>
      <div className="mt-2">
        <SkillTags skills={job.skills} />
      </div>
    </button>
  );
}
