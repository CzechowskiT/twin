"use client";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

export function MatchScoreBadge({
  score,
  band,
}: {
  score?: number | null;
  band?: string | null;
}) {
  const { t } = useTranslation();
  if (score == null) return null;
  const bandKey: TranslationKey =
    band === "excellent"
      ? "careerDiscovery.matchBandExcellent"
      : band === "good"
        ? "careerDiscovery.matchBandGood"
        : band === "fair"
          ? "careerDiscovery.matchBandFair"
          : "careerDiscovery.matchBandWeak";
  return (
    <span className="twin-badge text-xs">
      {t("careerDiscovery.matchScore")} {score}% · {t(bandKey)}
    </span>
  );
}
