"use client";

import { useTranslation } from "@/components/language-provider";
import type { CareerCandidateProfile } from "@/lib/career/candidate-profile-types";
import {
  evaluateSalaryFit,
  formatSalaryRange,
} from "@/lib/career/salary-match-service";
import type { JobListing } from "@/lib/career/job-types";
import type { TranslationKey } from "@/lib/i18n";

export function SalaryBadge({
  job,
  profile,
}: {
  job: JobListing;
  profile?: CareerCandidateProfile | null;
}) {
  const { t } = useTranslation();
  const fit = evaluateSalaryFit(job, profile);
  const fitKey: TranslationKey =
    fit === "above"
      ? "careerDiscovery.salaryAbove"
      : fit === "within"
        ? "careerDiscovery.salaryWithin"
        : fit === "below"
          ? "careerDiscovery.salaryBelow"
          : "careerDiscovery.salaryUnknown";
  return (
    <span className="twin-muted text-xs">
      {formatSalaryRange(job)} · {t(fitKey)}
    </span>
  );
}
