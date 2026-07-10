"use client";

import { InvestorRoadmapFounderUpdatesPanel } from "@/components/investor/investor-roadmap-founder-updates-panel";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { INVESTOR_ROADMAP_CONTROLLED_PREVIEW, INVESTOR_ROADMAP_SHIP_STATUS } from "@/lib/seven-day-d5-investor";
import { WAVE3_MOVE_TO_ROADMAP_MODULE_ID, WAVE3_SLICE2_RECRUITER_INTEGRATIONS_MODULE_ID } from "@/lib/all-workspace-green-gate";

export default function InvestorRoadmapPage() {
  const { t } = useTranslation();

  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <Shell wide data-wave2b-investor-roadmap-green={INVESTOR_ROADMAP_SHIP_STATUS} data-wave3-trust-center-roadmap={WAVE3_MOVE_TO_ROADMAP_MODULE_ID} data-wave3-integrations-roadmap={WAVE3_SLICE2_RECRUITER_INTEGRATIONS_MODULE_ID}>
        <header className="mb-8 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("investorRoadmap.eyebrow")}
          </p>
          <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("investorRoadmap.title")}</h1>
          <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("investorRoadmap.lead")}</p>
        </header>
        {INVESTOR_ROADMAP_CONTROLLED_PREVIEW ? (
          <Card variant="soft" className="mb-6 border-[var(--twin-border)]/80 p-5" data-seven-day-investor-roadmap-controlled-preview>
            <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("sevenDayD5.roadmapControlledPreviewBody")}</p>
          </Card>
        ) : null}
        <InvestorRoadmapFounderUpdatesPanel />
      </Shell>
    </PersonaWorkspaceGate>
  );
}
