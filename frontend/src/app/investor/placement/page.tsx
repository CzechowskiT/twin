"use client";

import Link from "next/link";

import { PlacementVerificationDemo } from "@/components/investor/placement-verification-demo";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function InvestorPlacementPage() {
  const { t } = useTranslation();

  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <Shell wide>
        <header className="mb-8 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("placementDemo.eyebrow")}
          </p>
          <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("placementDemo.title")}</h1>
        </header>
        <PlacementVerificationDemo />
        <Link href="/workspace/investor" className="twin-link mt-8 inline-block text-sm font-medium">
          ← {t("dataRoom.backInvestor")}
        </Link>
      </Shell>
    </PersonaWorkspaceGate>
  );
}
