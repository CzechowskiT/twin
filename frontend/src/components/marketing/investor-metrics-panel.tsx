"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card } from "@/components/ui";

type MvpStats = {
  validated_jobs: number;
  registered_users: number;
  total_applications: number;
  verified_placements: number;
  interviews_scheduled: number;
  profiles_with_cv: number;
  job_boards_in_registry: number;
  data_room_s3_enabled: boolean;
  data_room_local_demo: boolean;
  stripe_checkout_ready: boolean;
  mail_configured: boolean;
  google_calendar_configured: boolean;
  microsoft_calendar_configured: boolean;
  database_reachable: boolean;
  generated_at: string;
};

export function InvestorMetricsPanel() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<MvpStats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/public/mvp-stats", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        setStats((await res.json()) as MvpStats);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "error");
      }
    })();
  }, []);

  if (err) {
    return <p className="twin-muted text-sm">{t("investorMetrics.loadFailed")}</p>;
  }
  if (!stats) {
    return <p className="twin-muted text-sm">{t("common.loading")}</p>;
  }

  const tiles = [
    { label: t("investorMetrics.jobs"), value: stats.validated_jobs },
    { label: t("investorMetrics.users"), value: stats.registered_users },
    { label: t("investorMetrics.applications"), value: stats.total_applications },
    { label: t("investorMetrics.placements"), value: stats.verified_placements },
    { label: t("investorMetrics.interviews"), value: stats.interviews_scheduled },
    { label: t("investorMetrics.cvProfiles"), value: stats.profiles_with_cv },
    { label: t("investorMetrics.boards"), value: stats.job_boards_in_registry },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
              {tile.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{tile.value.toLocaleString()}</p>
          </Card>
        ))}
      </div>
      {stats.data_room_local_demo && !stats.data_room_s3_enabled ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          {t("investorMetrics.dataRoomDemoMode")}
        </p>
      ) : null}
      <ul className="twin-muted grid gap-1 text-xs sm:grid-cols-2">
        <li>{t("investorMetrics.flagMail")}: {stats.mail_configured ? "✓" : "—"}</li>
        <li>{t("investorMetrics.flagStripe")}: {stats.stripe_checkout_ready ? "✓" : "—"}</li>
        <li>{t("investorMetrics.flagGoogle")}: {stats.google_calendar_configured ? "✓" : "—"}</li>
        <li>{t("investorMetrics.flagMicrosoft")}: {stats.microsoft_calendar_configured ? "✓" : "—"}</li>
      </ul>
      <p className="twin-muted text-[10px]">
        {t("investorMetrics.updated")}: {new Date(stats.generated_at).toLocaleString()}
      </p>
    </div>
  );
}
