"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";

import type { DashboardProfile } from "./dashboard-helpers";

type Props = {
  profile: DashboardProfile;
};

/** Career compass strip — persisted completion preview from API. */
export function CareerCompassStrip({ profile }: Props) {
  const { t } = useTranslation();
  const preview = profile.career_compass_preview;

  if (preview?.configured) {
    const statusLabel = preview.readiness_complete
      ? t("dashboard.careerCompassStatsReady")
      : t("dashboard.careerCompassStatsIncomplete");
    return (
      <Card variant="soft" className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)]">{t("dashboard.careerCompassLink")}</p>
            <p className="twin-muted mt-1 text-xs">
              {t("dashboard.careerCompassStats")
                .replace("{readiness}", String(preview.completion_percent ?? "—"))
                .replace("{status}", statusLabel)}
              {preview.next_step_title
                ? ` · ${t("dashboard.careerCompassNextMilestone").replace("{title}", preview.next_step_title)}`
                : ""}
            </p>
          </div>
          <Link href="/dashboard/career" className="twin-btn-solid twin-touch-target shrink-0 text-center text-sm">
            {t("dashboard.careerCompassPageTitle")}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="soft" className="mb-4">
      <p className="text-sm text-[var(--twin-muted-strong)]">{t("dashboard.careerCompassPreviewHint")}</p>
      <Link href="/dashboard/career" className="twin-link mt-2 inline-block text-sm font-medium">
        {t("dashboard.careerCompassLink")} →
      </Link>
    </Card>
  );
}
