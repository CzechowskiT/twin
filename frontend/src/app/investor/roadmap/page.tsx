"use client";

import { InvestorRoadmapFounderUpdatesPanel } from "@/components/investor/investor-roadmap-founder-updates-panel";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function InvestorRoadmapPage() {
  const { t } = useTranslation();

  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <Shell wide>
        <header className="mb-8 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("investorRoadmap.eyebrow")}
          </p>
          <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("investorRoadmap.title")}</h1>
          <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("investorRoadmap.lead")}</p>
        </header>
        <InvestorRoadmapFounderUpdatesPanel />
      </Shell>
    </PersonaWorkspaceGate>
  );
}
