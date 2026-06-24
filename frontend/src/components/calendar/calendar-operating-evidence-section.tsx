"use client";

import type { ReactNode } from "react";

import { CalendarReadinessEvidencePanel } from "@/components/shared/calendar-readiness-evidence-panel";
import { useTranslation } from "@/components/language-provider";

/** Collapsible operating evidence section for calendar workspace — no polling. */
export function CalendarOperatingEvidenceSection(): ReactNode {
  const { t } = useTranslation();

  return (
    <details className="mb-6 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/40 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
        {t("calendarReadinessEvidence.workspaceSectionTitle")}
      </summary>
      <div className="mt-4">
        <CalendarReadinessEvidencePanel />
      </div>
    </details>
  );
}
