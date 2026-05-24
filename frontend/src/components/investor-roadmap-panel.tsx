"use client";

import { useTranslation } from "@/components/language-provider";
import {
  INVESTOR_COMPANIES,
  INVESTOR_PORTALS,
  portalDeployStatus,
  type PortalDeployStatus,
} from "@/lib/investor-roadmap";

function badgeClass(status: PortalDeployStatus): string {
  if (status === "live") {
    return "shrink-0 rounded bg-[var(--twin-accent)]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--twin-accent-hover)]";
  }
  if (status === "registry") {
    return "shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400";
  }
  return "shrink-0 rounded bg-[var(--twin-accent-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--twin-muted-strong)]";
}

function badgeKey(status: PortalDeployStatus): "dashboard.roadmapLiveBadge" | "dashboard.roadmapRegistryBadge" | "dashboard.roadmapPlannedBadge" {
  if (status === "live") return "dashboard.roadmapLiveBadge";
  if (status === "registry") return "dashboard.roadmapRegistryBadge";
  return "dashboard.roadmapPlannedBadge";
}

export function InvestorRoadmapPanel() {
  const { t } = useTranslation();
  return (
    <details className="group mt-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-3 text-sm open:bg-[var(--twin-card)] sm:p-4">
      <summary className="cursor-pointer list-none font-semibold text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
        <span className="inline-flex min-w-0 flex-wrap items-center gap-2 break-words">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--twin-accent)]/85" aria-hidden />
          {t("dashboard.roadmapSummary")}
        </span>
      </summary>
      <div className="mt-4 grid gap-6 border-t border-[var(--twin-border)] pt-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("dashboard.roadmapPortalsTitle")}
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 text-xs text-[var(--twin-muted)]">
            {INVESTOR_PORTALS.map((p) => {
              const status = portalDeployStatus(p.boardId, p.scrapingVerified);
              return (
              <li key={p.name} className="flex items-start justify-between gap-2">
                <span className="min-w-0">{p.name}</span>
                <span className={badgeClass(status)}>
                  {t(badgeKey(status))}
                </span>
              </li>
            );
            })}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("dashboard.roadmapCompaniesTitle")}
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 text-xs text-[var(--twin-muted)]">
            {INVESTOR_COMPANIES.map((c) => {
              const status = portalDeployStatus(c.boardId, c.scrapingVerified);
              return (
              <li key={`${c.name}-${c.boardId ?? "planned"}`} className="flex items-start justify-between gap-2">
                <span>{c.name}</span>
                <span className={badgeClass(status)}>
                  {t(badgeKey(status))}
                </span>
              </li>
            );
            })}
          </ul>
        </div>
      </div>
      <p className="twin-muted mt-3 text-[11px] leading-relaxed">{t("dashboard.roadmapFootnote")}</p>
    </details>
  );
}
