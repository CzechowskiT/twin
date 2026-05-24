"use client";

import { useTranslation } from "@/components/language-provider";

export function RemotePercentageLabel({ pct }: { pct: number | null | undefined }) {
  const { t } = useTranslation();
  if (pct == null) {
    return <span className="twin-muted text-xs">{t("jobBoard.remoteUnknown")}</span>;
  }
  if (pct >= 100) {
    return <span className="twin-badge text-xs">{t("jobBoard.remoteFull")}</span>;
  }
  if (pct === 0) {
    return <span className="twin-badge text-xs">{t("jobBoard.remoteOnsite")}</span>;
  }
  return (
    <span className="twin-badge text-xs">
      {t("jobBoard.remoteHybrid").replace("{pct}", String(pct))}
    </span>
  );
}
