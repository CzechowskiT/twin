"use client";

import { IntegrationsHubPanel } from "@/components/integrations/integrations-hub-panel";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";

export default function CandidateIntegrationsPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("integrationsHub.title")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("integrationsHub.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("integrationsHub.leadCandidate")}</p>
      </header>
      <IntegrationsHubPanel
        persona="candidate"
        backHref="/dashboard"
        backLabelKey="integrationsHub.backCandidate"
      />
    </Shell>
  );
}
