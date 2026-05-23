"use client";

import { useTranslation } from "@/components/language-provider";

export function ApplyTrackingCounter({
  count,
  recent,
}: {
  count: number;
  recent?: number;
}) {
  const { t } = useTranslation();
  if (count <= 0) return null;
  return (
    <p className="twin-muted text-xs">
      {t("jobBoard.applyCount").replace("{count}", String(count))}
      {recent && recent > 0
        ? ` · ${t("jobBoard.applyCountRecent").replace("{count}", String(recent))}`
        : ""}
    </p>
  );
}
