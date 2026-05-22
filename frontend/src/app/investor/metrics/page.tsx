"use client";

import Link from "next/link";

import { InvestorMetricsPanel } from "@/components/marketing/investor-metrics-panel";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

/** US-I001+ public traction metrics for investor persona. */
export default function InvestorMetricsPage() {
  const { t } = useTranslation();

  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <Shell wide>
        <header className="mb-8 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("investorMetrics.eyebrow")}
          </p>
          <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("investorMetrics.title")}</h1>
          <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("investorMetrics.lead")}</p>
          <Link href="/investor/calculator" className="twin-link text-sm font-medium">
            {t("investorMetrics.calcLink")}
          </Link>
        </header>
        <InvestorMetricsPanel />
      </Shell>
    </PersonaWorkspaceGate>
  );
}
