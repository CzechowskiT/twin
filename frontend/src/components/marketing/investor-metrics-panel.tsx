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
  paid_subscribers: number;
  subscription_mrr_usd: number | null;
  generated_at: string;
};

const EARLY_USER_THRESHOLD = 50;
const EARLY_APP_THRESHOLD = 25;

function isEarlyStage(stats: MvpStats): boolean {
  return stats.registered_users < EARLY_USER_THRESHOLD || stats.total_applications < EARLY_APP_THRESHOLD;
}

type IntegrationFlag = "mail" | "stripe" | "google" | "microsoft";

function integrationStatus(
  key: IntegrationFlag,
  on: boolean,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (on) return `✓ ${t("investorMetrics.flagStatusLive")}`;
  if (key === "microsoft" || key === "stripe") return t("investorMetrics.flagStatusSoon");
  return t("investorMetrics.flagStatusPrep");
}

export function InvestorMetricsPanel() {
  const { t, locale } = useTranslation();
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

  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);

  if (err) {
    return <p className="twin-muted text-sm">{t("investorMetrics.loadFailed")}</p>;
  }
  if (!stats) {
    return <p className="twin-muted text-sm">{t("common.loading")}</p>;
  }

  const money = (n: number) =>
    n.toLocaleString(loc, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const mrrDisplay =
    stats.subscription_mrr_usd != null
      ? money(stats.subscription_mrr_usd)
      : t("investorMetrics.subscriptionMrrStub");

  const early = isEarlyStage(stats);

  const tiles = [
    { label: t("investorMetrics.jobs"), value: stats.validated_jobs, highlight: false },
    {
      label: t("investorMetrics.mauProxy"),
      value: stats.registered_users,
      hint: t("investorMetrics.mauProxyHint"),
      highlight: true,
    },
    { label: t("investorMetrics.applications"), value: stats.total_applications, highlight: false },
    { label: t("investorMetrics.placements"), value: stats.verified_placements, highlight: false },
    { label: t("investorMetrics.interviews"), value: stats.interviews_scheduled, highlight: false },
    { label: t("investorMetrics.cvProfiles"), value: stats.profiles_with_cv, highlight: false },
    { label: t("investorMetrics.boards"), value: stats.job_boards_in_registry, highlight: false },
    { label: t("investorMetrics.paidSubscribers"), value: stats.paid_subscribers ?? 0, highlight: false },
  ];

  return (
    <div className="space-y-4">
      {early ? (
        <p className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)] px-3 py-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
          <span className="me-2 inline-block rounded bg-[var(--twin-accent-muted)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--twin-accent)]">
            {t("investorMetrics.earlyStageBadge")}
          </span>
          {t("investorMetrics.earlyStageNote")}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className={`p-4 ${tile.highlight ? "ring-1 ring-[var(--twin-accent)]/25" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
              {tile.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{fmt(tile.value)}</p>
            {tile.hint ? (
              <p className="mt-2 text-[10px] leading-relaxed text-[var(--twin-muted)]">{tile.hint}</p>
            ) : null}
          </Card>
        ))}
      </div>
      {stats.data_room_local_demo && !stats.data_room_s3_enabled ? (
        <p className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)] px-3 py-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
          {t("investorMetrics.dataRoomDemoMode")}
        </p>
      ) : null}
      <section aria-labelledby="investor-unit-economics">
        <h2 id="investor-unit-economics" className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
          {t("investorMetrics.unitEconomicsTitle")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--twin-muted)]">{t("investorMetrics.unitEconomicsLead")}</p>
        <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("investorMetrics.preRevenueNote")}</p>
        <p className="mt-2 text-sm font-semibold tabular-nums text-[var(--foreground)]">
          {t("investorMetrics.subscriptionMrr")}: {mrrDisplay}
        </p>
        <h3 className="mt-4 text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
          {t("investorMetrics.readinessTitle")}
        </h3>
        <ul className="twin-muted mt-2 grid gap-1 text-xs sm:grid-cols-2">
          <li>
            {t("investorMetrics.flagMail")}: {integrationStatus("mail", stats.mail_configured, t)}
          </li>
          <li>
            {t("investorMetrics.flagStripe")}: {integrationStatus("stripe", stats.stripe_checkout_ready, t)}
          </li>
          <li>
            {t("investorMetrics.flagGoogle")}: {integrationStatus("google", stats.google_calendar_configured, t)}
          </li>
          <li>
            {t("investorMetrics.flagMicrosoft")}:{" "}
            {integrationStatus("microsoft", stats.microsoft_calendar_configured, t)}
          </li>
        </ul>
      </section>
      <p className="twin-muted text-[10px]">
        {t("investorMetrics.updated")}: {new Date(stats.generated_at).toLocaleString(loc)}
        {stats.database_reachable ? "" : ` · ${t("investorMetrics.dbUnreachable")}`}
      </p>
    </div>
  );
}
