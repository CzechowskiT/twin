"use client";

import { useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { SystemOfRecordNavigationHub } from "@/components/workspace/system-of-record-navigation-hub";

/** Collapsible system-of-record navigation on candidate dashboard. */
export function CandidateModuleNav() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-4 sm:mb-6" data-testid="candidate-module-nav">
      {expanded ? (
        <SystemOfRecordNavigationHub
          persona="candidate"
          titleKey="workspaceModules.candidateHubTitle"
          leadKey="systemOfRecord.candidateHubLead"
        />
      ) : (
        <section className="rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("systemOfRecord.hubEyebrow")}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                {t("workspaceModules.candidateHubTitle")}
              </h2>
            </div>
            <button
              type="button"
              className="twin-link text-sm font-semibold"
              onClick={() => setExpanded(true)}
              aria-expanded={expanded}
            >
              {t("workspaceModules.showAllModules")}
            </button>
          </div>
        </section>
      )}
      {expanded ? (
        <button
          type="button"
          className="twin-link mt-2 text-sm font-semibold"
          onClick={() => setExpanded(false)}
          aria-expanded={expanded}
        >
          {t("workspaceModules.showFewerModules")}
        </button>
      ) : null}
    </div>
  );
}
