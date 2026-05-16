"use client";

import { useTranslation } from "@/components/language-provider";
import { INVESTOR_COMPANIES, INVESTOR_PORTALS, isLivePortal } from "@/lib/investor-roadmap";

export function InvestorRoadmapPanel() {
  const { t } = useTranslation();
  return (
    <details className="group mt-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-3 text-sm open:bg-[var(--twin-card)] sm:p-4">
      <summary className="cursor-pointer list-none font-semibold text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/80" aria-hidden />
          {t("dashboard.roadmapSummary")}
        </span>
      </summary>
      <div className="mt-4 grid gap-6 border-t border-[var(--twin-border)] pt-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("dashboard.roadmapPortalsTitle")}
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 text-xs text-[var(--twin-muted)]">
            {INVESTOR_PORTALS.map((p) => (
              <li key={p.name} className="flex items-start justify-between gap-2">
                <span className="min-w-0">{p.name}</span>
                <span
                  className={
                    isLivePortal(p.boardId)
                      ? "shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-800"
                      : "shrink-0 rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600"
                  }
                >
                  {isLivePortal(p.boardId) ? t("dashboard.roadmapLiveBadge") : t("dashboard.roadmapPlannedBadge")}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("dashboard.roadmapCompaniesTitle")}
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 text-xs text-[var(--twin-muted)]">
            {INVESTOR_COMPANIES.map((c) => (
              <li key={c.name} className="flex items-start justify-between gap-2">
                <span>{c.name}</span>
                <span className="shrink-0 rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                  {t("dashboard.roadmapPlannedBadge")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="twin-muted mt-3 text-[11px] leading-relaxed">{t("dashboard.roadmapFootnote")}</p>
    </details>
  );
}
