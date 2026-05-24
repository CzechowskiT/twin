"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { ButtonChip, Card } from "@/components/ui";
import type { JobPostDraft } from "@/components/career/job-post-builder";

const DEMO_APPLICANTS = [
  { name: "Alex K.", skills: ["Python", "FastAPI", "PostgreSQL"] },
  { name: "Marta W.", skills: ["React", "TypeScript", "Node"] },
  { name: "Jan P.", skills: ["Go", "Kubernetes"] },
];

function overlapScore(roleSkills: string[], candidateSkills: string[]): number {
  if (!roleSkills.length) return 0;
  const hits = roleSkills.filter((s) =>
    candidateSkills.some((c) => c.toLowerCase().includes(s.toLowerCase())),
  );
  return Math.round((hits.length / roleSkills.length) * 100);
}

export function CandidateScoringPanel({ draft }: { draft: JobPostDraft | null }) {
  const { t } = useTranslation();
  const [scored, setScored] = useState(false);
  const roleSkills = useMemo(
    () =>
      draft?.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
    [draft],
  );
  const ranked = useMemo(() => {
    if (!scored || !roleSkills.length) return [];
    return DEMO_APPLICANTS.map((a) => ({
      ...a,
      score: overlapScore(roleSkills, a.skills),
    })).sort((a, b) => b.score - a.score);
  }, [scored, roleSkills]);

  return (
    <Card className="p-4">
      <h2 className="text-sm font-medium">{t("careerDiscovery.scoringTitle")}</h2>
      <p className="twin-muted mt-1 text-xs">{t("careerDiscovery.scoringLead")}</p>
      {!draft ? (
        <p className="twin-muted mt-3 text-sm">{t("careerDiscovery.scoringEmpty")}</p>
      ) : (
        <>
          <ButtonChip type="button" className="mt-3" onClick={() => setScored(true)}>
            {t("careerDiscovery.scoringRun")}
          </ButtonChip>
          {ranked.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {ranked.map((row) => (
                <li
                  key={row.name}
                  className="flex justify-between rounded border border-[var(--twin-border)] px-3 py-2"
                >
                  <span>{row.name}</span>
                  <span className="twin-muted text-xs">
                    {t("careerDiscovery.scoringResult")}: {row.score}%
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </Card>
  );
}
