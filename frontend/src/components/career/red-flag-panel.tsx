"use client";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";
import { detectRedFlags } from "@/lib/career/red-flag-service";
import type { JobListing } from "@/lib/career/job-types";
import type { TranslationKey } from "@/lib/i18n";

function flagLabel(
  flag: string,
  t: (key: TranslationKey) => string,
): string {
  if (flag === "no_salary_disclosed") return t("careerDiscovery.redFlagNoSalary");
  if (flag === "skill_sprawl") return t("careerDiscovery.redFlagSkillSprawl");
  return flag;
}

export function RedFlagPanel({ job }: { job: JobListing }) {
  const { t } = useTranslation();
  const flags = detectRedFlags(job);
  if (!flags.length) return null;
  return (
    <Card variant="soft" className="mt-4 p-3">
      <h3 className="text-sm font-medium">{t("careerDiscovery.redFlagsTitle")}</h3>
      <ul className="mt-2 list-inside list-disc text-xs">
        {flags.map((flag) => (
          <li key={flag}>{flagLabel(flag, t)}</li>
        ))}
      </ul>
    </Card>
  );
}
