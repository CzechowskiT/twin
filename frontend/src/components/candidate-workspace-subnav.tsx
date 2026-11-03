"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { TRUST_CENTER_ROADMAP_OUTSIDE_HREF } from "@/lib/all-workspace-green-gate";
import {
  CANDIDATE_PRIMARY_IA,
  CANDIDATE_SECONDARY_IA,
} from "@/lib/candidate-ia";
import { TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE } from "@/lib/seven-day-d2-candidate";

const navClass =
  "twin-workspace-subnav flex min-w-0 max-w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:gap-x-4";

const itemClass =
  "twin-link inline-flex min-h-[2.75rem] items-center whitespace-nowrap px-1 text-sm";

type CandidateWorkspaceSubnavProps = {
  ariaLabel: string;
  onExportJson?: () => void;
  exportJsonBusy?: boolean;
};

/** Epic 2.9: seven primary destinations + progressive More. */
export function CandidateWorkspaceSubnav({
  ariaLabel,
  onExportJson,
  exportJsonBusy = false,
}: CandidateWorkspaceSubnavProps) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav className={navClass} aria-label={ariaLabel} data-candidate-workspace-subnav-green-only data-ia="epic-2-9">
      {CANDIDATE_PRIMARY_IA.map((item) => (
        <Link key={item.id} href={item.href} className={itemClass}>
          {t(item.labelKey)}
        </Link>
      ))}
      <button
        type="button"
        className={`${itemClass} cursor-pointer border-0 bg-transparent p-0 font-[inherit]`}
        aria-expanded={moreOpen}
        aria-controls="candidate-ia-more"
        onClick={() => setMoreOpen((v) => !v)}
      >
        {moreOpen ? t("pilotConsolidation.navLess") : t("pilotConsolidation.navMore")}
      </button>
      {moreOpen ? (
        <div id="candidate-ia-more" className="flex w-full flex-wrap items-center gap-x-3 gap-y-2">
          {CANDIDATE_SECONDARY_IA.map((item) => (
            <Link key={item.href} href={item.href} className={itemClass}>
              {t(item.labelKey)}
            </Link>
          ))}
          {TRUST_CENTER_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE ? (
            <Link href={TRUST_CENTER_ROADMAP_OUTSIDE_HREF} className={itemClass}>
              {t("profile.trustRoadmapLink")}
            </Link>
          ) : null}
          {onExportJson ? (
            <button
              type="button"
              className={`${itemClass} cursor-pointer border-0 bg-transparent p-0 font-[inherit] disabled:opacity-50`}
              disabled={exportJsonBusy}
              aria-label={t("dashboard.exportMyDataJsonAria")}
              onClick={() => onExportJson()}
            >
              {exportJsonBusy ? "…" : t("dashboard.exportMyDataJson")}
            </button>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
