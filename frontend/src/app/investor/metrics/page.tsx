"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { InvestorMetricsPanel } from "@/components/marketing/investor-metrics-panel";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import {
  INVESTOR_CALCULATOR_DEFAULTS,
  PLACEMENT_NET_TAKE_RATE_PERCENT,
} from "@/lib/investor-calculator-model";

type MvpStatsTraction = {
  total_applications: number;
  verified_placements: number;
  interviews_scheduled: number;
};

function estimatedPlacementRevenueUsd(verifiedPlacements: number): number {
  if (verifiedPlacements <= 0) return 0;
  const monthlySalary = INVESTOR_CALCULATOR_DEFAULTS.averageSalary / 12;
  const netPerPlacement = monthlySalary * (PLACEMENT_NET_TAKE_RATE_PERCENT / 100);
  return verifiedPlacements * netPerPlacement;
}

function TractionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--twin-surface-2)] px-3 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function InvestorTractionHighlight({ stats }: { stats: MvpStatsTraction }) {
  const { t, locale } = useTranslation();
  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);
  const money = (n: number) =>
    n.toLocaleString(loc, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const placementRevenue = estimatedPlacementRevenueUsd(stats.verified_placements);
  const showPlacementRevenue = stats.verified_placements > 0 || placementRevenue > 0;

  if (showPlacementRevenue) {
    return (
      <Card className="mb-6 p-5 ring-1 ring-[var(--twin-accent)]/25">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
          {t("investorMetrics.placementRevenueTitle")}
        </p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{money(placementRevenue)}</p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
          {t("investorMetrics.placementRevenueLead")}
        </p>
        <p className="mt-2 text-sm tabular-nums text-[var(--foreground)]">
          {t("investorMetrics.placementRevenueCount").replace("{count}", fmt(stats.verified_placements))}
        </p>
      </Card>
    );
  }

  return (
    <Card className="mb-6 p-5 ring-1 ring-[var(--twin-accent)]/25">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
        {t("investorMetrics.recruitmentPipelineTitle")}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
        {t("investorMetrics.recruitmentPipelineLead")}
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <TractionStat label={t("investorMetrics.applications")} value={fmt(stats.total_applications)} />
        <TractionStat label={t("investorMetrics.interviews")} value={fmt(stats.interviews_scheduled)} />
      </dl>
    </Card>
  );
}

/** US-I001+ public traction metrics for investor persona. */
export default function InvestorMetricsPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<MvpStatsTraction | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/public/mvp-stats", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as MvpStatsTraction;
        if (!cancelled) setStats(json);
      } catch {
        /* panel handles its own error state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <Shell wide>
        <header className="mb-8 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("investorMetrics.eyebrow")}
          </p>
          <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("investorMetrics.title")}</h1>
          <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("investorMetrics.lead")}</p>
          <p className="max-w-2xl text-xs leading-relaxed text-[var(--twin-muted)]">{t("investorMetrics.earlyStageNote")}</p>
          <Link href="/investor/calculator" className="twin-link text-sm font-medium">
            {t("investorMetrics.calcLink")}
          </Link>
        </header>
        {stats ? <InvestorTractionHighlight stats={stats} /> : null}
        <InvestorMetricsPanel />
      </Shell>
    </PersonaWorkspaceGate>
  );
}
