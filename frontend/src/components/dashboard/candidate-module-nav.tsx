"use client";

import { useState } from "react";

import { useTranslation } from "@/components/language-provider";
import {
  CANDIDATE_MODULE_NAV_COLLAPSED_COUNT,
  CANDIDATE_WORKSPACE_MODULES,
} from "@/lib/candidate-workspace-modules";

import { WorkspaceModuleGrid } from "../workspace/workspace-module-grid";

/** Collapsible module navigation strip on candidate dashboard. */
export function CandidateModuleNav() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? CANDIDATE_WORKSPACE_MODULES
    : CANDIDATE_WORKSPACE_MODULES.slice(0, CANDIDATE_MODULE_NAV_COLLAPSED_COUNT);

  return (
    <section
      className="mb-4 rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-4 sm:mb-6 sm:p-5"
      aria-labelledby="candidate-module-nav-title"
      data-testid="candidate-module-nav"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
            {t("workspaceModules.hubEyebrow")}
          </p>
          <h2 id="candidate-module-nav-title" className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            {t("workspaceModules.candidateHubTitle")}
          </h2>
        </div>
        <button
          type="button"
          className="twin-link text-sm font-semibold"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? t("workspaceModules.showFewerModules") : t("workspaceModules.showAllModules")}
        </button>
      </div>
      <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">{t("workspaceModules.candidateHubLead")}</p>
      <div className="mt-4">
        <WorkspaceModuleGrid modules={visible} />
      </div>
    </section>
  );
}
