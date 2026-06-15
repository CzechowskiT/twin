"use client";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  TALENT_RADAR_VISUAL_MARKERS,
  talentRadarSummaryStatClass,
  type TalentRadarSummaryStats,
} from "@/lib/recruiter-talent-radar-visual";

type StatKey = "total" | "strongMatches" | "needsVerification" | "lowConfidence";

const STAT_CONFIG: { key: StatKey; labelKey: TranslationKey }[] = [
  { key: "total", labelKey: "recruiterTalentRadar.summaryCandidates" },
  { key: "strongMatches", labelKey: "recruiterTalentRadar.summaryStrong" },
  { key: "needsVerification", labelKey: "recruiterTalentRadar.summaryVerification" },
  { key: "lowConfidence", labelKey: "recruiterTalentRadar.summaryLowConfidence" },
];

export function TalentRadarSummaryPanel({ stats }: { stats: TalentRadarSummaryStats }) {
  const { t } = useTranslation();

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      data-testid={TALENT_RADAR_VISUAL_MARKERS.summaryPanel}
    >
      {STAT_CONFIG.map(({ key, labelKey }) => (
        <div key={key} className={talentRadarSummaryStatClass()}>
          <p className="text-2xl font-bold tabular-nums text-[var(--foreground)]">{stats[key]}</p>
          <p className="mt-0.5 text-xs font-medium text-[var(--twin-muted-strong)]">{t(labelKey)}</p>
        </div>
      ))}
      <p className="sm:col-span-2 lg:col-span-4 text-xs text-[var(--twin-muted-strong)]">
        {t("recruiterTalentRadar.summaryNoAutoOutreach")}
      </p>
    </div>
  );
}
