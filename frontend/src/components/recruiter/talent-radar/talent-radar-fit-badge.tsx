"use client";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  talentRadarFitBadgeClass,
  talentRadarFitBandFromScore,
  talentRadarFitBandRange,
  type TalentRadarFitBand,
} from "@/lib/recruiter-talent-radar-visual";

function fitBandLabelKey(band: TalentRadarFitBand): TranslationKey {
  const map: Record<TalentRadarFitBand, TranslationKey> = {
    strong: "recruiterTalentRadar.fitBandStrong",
    good: "recruiterTalentRadar.fitBandGood",
    possible: "recruiterTalentRadar.fitBandPossible",
    low: "recruiterTalentRadar.fitBandLow",
  };
  return map[band];
}

export function TalentRadarFitBadge({ score }: { score: number }) {
  const { t } = useTranslation();
  const band = talentRadarFitBandFromScore(score);

  return (
    <span className={talentRadarFitBadgeClass(band)} title={talentRadarFitBandRange(band)}>
      <span>{t(fitBandLabelKey(band))}</span>
      <span className="font-normal opacity-75">{score}</span>
    </span>
  );
}
