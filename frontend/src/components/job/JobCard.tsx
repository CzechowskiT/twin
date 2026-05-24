"use client";

import { ApplyTrackingCounter } from "@/components/job/ApplyTrackingCounter";
import { CultureTags } from "@/components/job/CultureTags";
import { OneClickApply } from "@/components/job/OneClickApply";
import { RemotePercentageLabel } from "@/components/job/RemotePercentageLabel";
import { SeniorityBadge } from "@/components/job/SeniorityBadge";
import { SkillMatchBadge } from "@/components/job/SkillMatchBadge";
import { TechStackIcons } from "@/components/job/TechStackIcons";

export type CompetitiveJobRow = {
  id: number;
  title: string;
  company: string;
  location: string | null;
  url: string;
  job_board: string;
  salary_min?: number | null;
  salary_max?: number | null;
  score?: number | null;
  tech_stack?: string[];
  remote_percentage?: number | null;
  seniority_level?: string | null;
  culture_tags?: string[];
  skill_match_percent?: number | null;
  skill_band?: string | null;
  apply_count?: number;
  apply_recent?: number;
};

export function JobCard({
  job,
  selected,
  onSelect,
  onApplied,
}: {
  job: CompetitiveJobRow;
  selected?: boolean;
  onSelect: (job: CompetitiveJobRow) => void;
  onApplied?: () => void;
}) {
  const salary =
    job.salary_min && job.salary_max
      ? `${job.salary_min.toLocaleString()}–${job.salary_max.toLocaleString()} PLN`
      : job.salary_max
        ? `≤ ${job.salary_max.toLocaleString()} PLN`
        : null;

  return (
    <article
      className={`twin-job-row flex flex-col gap-2 ${selected ? "ring-1 ring-[var(--twin-accent)]" : ""}`}
    >
      <button type="button" onClick={() => onSelect(job)} className="w-full text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{job.title}</p>
            <p className="twin-muted text-xs">
              {job.company}
              {job.location ? ` · ${job.location}` : ""} · {job.job_board}
              {salary ? ` · ${salary}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <SeniorityBadge level={job.seniority_level} />
            <SkillMatchBadge percent={job.skill_match_percent ?? job.score} band={job.skill_band} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <RemotePercentageLabel pct={job.remote_percentage} />
          <TechStackIcons stack={job.tech_stack ?? []} />
        </div>
        <CultureTags tags={job.culture_tags ?? []} />
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ApplyTrackingCounter count={job.apply_count ?? 0} recent={job.apply_recent} />
        <OneClickApply jobId={job.id} jobUrl={job.url} onApplied={onApplied} />
      </div>
    </article>
  );
}
