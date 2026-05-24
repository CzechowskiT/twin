"use client";

import { useTranslation } from "@/components/language-provider";

export function SkillMatchBadge({
  percent,
  band,
}: {
  percent: number | null | undefined;
  band?: string | null;
}) {
  const { t } = useTranslation();
  if (percent == null) return null;
  const tone =
    band === "strong" || percent >= 80
      ? "twin-badge--match"
      : percent >= 60
        ? "twin-badge"
        : "twin-badge opacity-80";
  return (
    <span className={`twin-badge ${tone} text-xs font-medium`} title={t("jobBoard.skillMatchTitle")}>
      {t("jobBoard.skillMatch")}: {Math.round(percent)}%
    </span>
  );
}
