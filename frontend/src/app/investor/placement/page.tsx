"use client";

import Link from "next/link";

import { PlacementVerificationDemo } from "@/components/investor/placement-verification-demo";
import { InvestorPlacementReadonlyPanel } from "@/components/investor/investor-placement-readonly-panel";
import { DemoJourneyPilotStatus } from "@/components/workspace/demo-journey-pilot-status";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { PLACEMENT_LIMITED_PILOT } from "@/lib/seven-day-d5-investor";

export default function InvestorPlacementPage() {
  const { t } = useTranslation();

  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <Shell wide>
        <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("placementDemo.eyebrow")}
            </p>
            <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("placementDemo.title")}</h1>
          </div>
          <DemoJourneyPilotStatus status="pilot" />
        </header>
        {PLACEMENT_LIMITED_PILOT ? (
          <Card
            variant="soft"
            className="mb-6 border-[var(--twin-border)]/80 p-5"
            data-testid="seven-day-investor-placement-pilot-boundary"
            data-seven-day-investor-placement-pilot-boundary
          >
            <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("sevenDayD5.placementPilotBoundaryBody")}</p>
          </Card>
        ) : null}
        <InvestorPlacementReadonlyPanel />
        <details className="mt-6 rounded-lg border border-[var(--twin-border)] p-4">
          <summary className="cursor-pointer text-sm font-medium">Sample illustration (demo timeline)</summary>
          <div className="mt-4">
            <PlacementVerificationDemo />
          </div>
        </details>
        <Link href="/workspace/investor" className="twin-link mt-8 inline-block text-sm font-medium">
          ← {t("dataRoom.backInvestor")}
        </Link>
      </Shell>
    </PersonaWorkspaceGate>
  );
}
