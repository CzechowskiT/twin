"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MatchScoreBadge } from "@/components/career/match-score-badge";
import { RedFlagPanel } from "@/components/career/red-flag-panel";
import { SalaryBadge } from "@/components/career/salary-badge";
import { SkillTags } from "@/components/career/skill-tags";
import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { computeMatchScore } from "@/lib/career/match-score-service";
import type { CareerCandidateProfile } from "@/lib/career/candidate-profile-types";
import type { JobListing } from "@/lib/career/job-types";

export function JobDetailView({
  job,
  profile,
}: {
  job: JobListing | null;
  profile?: CareerCandidateProfile | null;
}) {
  const { t } = useTranslation();
  const match = useMemo(
    () => (job ? computeMatchScore(job, profile) : null),
    [job, profile],
  );

  if (!job) {
    return (
      <Card className="p-4">
        <p className="twin-muted text-sm">{t("careerDiscovery.selectJob")}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{job.title}</h2>
          <p className="twin-muted text-sm">
            {job.company} · {job.location ?? "—"}
          </p>
        </div>
        <MatchScoreBadge score={match?.score} band={match?.band} />
      </div>
      <div className="mt-3">
        <SalaryBadge job={job} profile={profile} />
      </div>
      <div className="mt-3">
        <SkillTags skills={job.skills} max={12} />
      </div>
      {job.description ? (
        <div className="mt-4">
          <h3 className="text-sm font-medium">{t("careerDiscovery.description")}</h3>
          <p className="twin-muted mt-1 whitespace-pre-wrap text-sm">{job.description}</p>
        </div>
      ) : null}
      {job.requirements ? (
        <div className="mt-4">
          <h3 className="text-sm font-medium">{t("careerDiscovery.requirements")}</h3>
          <p className="twin-muted mt-1 whitespace-pre-wrap text-sm">{job.requirements}</p>
        </div>
      ) : null}
      <RedFlagPanel job={job} />
      <p className="mt-4">
        <Link
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="twin-link text-sm"
        >
          {t("careerDiscovery.viewListing")} →
        </Link>
      </p>
    </Card>
  );
}
