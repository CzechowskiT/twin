"use client";

import { useState, type ReactNode } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import type { MarketingPersona } from "@/lib/marketing-persona";
import {
  getWorkspaceModuleActivationStatus,
} from "@/lib/all-workspace-modules-activation";
import { splitActivationSurfaceRoutes } from "@/lib/product-surface-visibility";
import {
  INVESTOR_BOARD_COLLAPSED_DEFAULT,
} from "@/lib/seven-day-d5-investor";
import {
  getSystemOfRecordRoutesForPersona,
  groupInvestorSoRRoutes,
  INVESTOR_SOR_GROUP_HEADING_KEYS,
  INVESTOR_SOR_GROUP_LEAD_KEYS,
  INVESTOR_SOR_GROUP_ORDER,
  SYSTEM_OF_RECORD_HUB_MARKER,
  type SystemOfRecordRouteEntry,
} from "@/lib/system-of-record-routes";

import { SystemOfRecordModuleCard } from "./system-of-record-module-card";

function SoRModuleGrid({ routes }: { routes: readonly SystemOfRecordRouteEntry[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {routes.map((route) => (
        <li key={route.id} className="min-w-0">
          <SystemOfRecordModuleCard route={route} />
        </li>
      ))}
    </ul>
  );
}

function ActivationHubSection({
  titleKey,
  leadKey,
  routes,
  sectionId,
  defaultCollapsed = false,
}: {
  titleKey: TranslationKey;
  leadKey: TranslationKey;
  routes: readonly SystemOfRecordRouteEntry[];
  sectionId: string;
  defaultCollapsed?: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  if (routes.length === 0) return null;

  return (
    <div data-activation-hub-section={sectionId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{t(titleKey)}</h3>
          <p className="twin-muted mt-1 max-w-3xl text-xs leading-relaxed">{t(leadKey)}</p>
        </div>
        {defaultCollapsed ? (
          <button
            type="button"
            className="twin-link text-sm font-semibold"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            data-testid={`activation-hub-toggle-${sectionId}`}
          >
            {expanded ? t("productSurface.hideSection") : t("productSurface.showSection")}
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className="mt-3">
          <SoRModuleGrid routes={routes} />
        </div>
      ) : null}
    </div>
  );
}

export function SystemOfRecordNavigationHub({
  persona,
  titleKey,
  leadKey,
  eyebrowKey = "systemOfRecord.hubEyebrow",
  children,
}: {
  persona: MarketingPersona;
  titleKey: TranslationKey;
  leadKey: TranslationKey;
  eyebrowKey?: TranslationKey;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const routes = getSystemOfRecordRoutesForPersona(persona);
  const surface = splitActivationSurfaceRoutes(persona, routes);
  const [boardExpanded, setBoardExpanded] = useState(!INVESTOR_BOARD_COLLAPSED_DEFAULT);

  const investorProductRoutes = [
    ...surface.core,
    ...surface.extended,
    ...surface.pilotPreview,
    ...surface.comingSoonPaused,
  ];
  const investorGrouped = groupInvestorSoRRoutes(investorProductRoutes);
  const investorBoardRoutes = groupInvestorSoRRoutes([
    ...getSystemOfRecordRoutesForPersona("investor").filter(
      (r) => getWorkspaceModuleActivationStatus(r.id) !== "INTERNAL",
    ),
  ]).boardEvidence;

  return (
    <section
      className="rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface-2)]/40 p-4 sm:p-5"
      aria-labelledby={`sor-hub-${persona}-title`}
      data-testid={SYSTEM_OF_RECORD_HUB_MARKER}
      data-sor-persona={persona}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
        {t(eyebrowKey)}
      </p>
      <h2 id={`sor-hub-${persona}-title`} className="mt-1 text-lg font-semibold text-[var(--foreground)]">
        {t(titleKey)}
      </h2>
      <p className="twin-muted mt-2 max-w-3xl text-sm leading-relaxed">{t(leadKey)}</p>
      {persona === "investor" ? (
        <div className="mt-4 space-y-6" data-product-surface-hub="investor">
          <div className="space-y-8" data-product-surface-primary>
            {INVESTOR_SOR_GROUP_ORDER.filter((g) => g !== "boardEvidence").map((group) => {
              const groupRoutes = investorGrouped[group];
              if (groupRoutes.length === 0) return null;
              return (
                <div key={group} data-sor-investor-group={group}>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    {t(INVESTOR_SOR_GROUP_HEADING_KEYS[group])}
                  </h3>
                  <p className="twin-muted mt-1 max-w-3xl text-xs leading-relaxed">
                    {t(INVESTOR_SOR_GROUP_LEAD_KEYS[group])}
                  </p>
                  <div className="mt-3">
                    <SoRModuleGrid routes={groupRoutes} />
                  </div>
                </div>
              );
            })}
          </div>
          {investorBoardRoutes.length > 0 ? (
            <div data-product-surface-board data-seven-day-investor-board>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">
                    {t("sevenDayD5.investorBoardHiddenTitle")}
                  </h3>
                  <p className="twin-muted mt-1 max-w-3xl text-xs leading-relaxed">
                    {t("sevenDayD5.investorBoardHiddenLead")}
                  </p>
                </div>
                <button
                  type="button"
                  className="twin-link text-sm font-semibold"
                  onClick={() => setBoardExpanded((open) => !open)}
                  aria-expanded={boardExpanded}
                  data-testid="investor-board-internal-toggle"
                >
                  {boardExpanded ? t("sevenDayD5.investorBoardHide") : t("sevenDayD5.investorBoardShow")}
                </button>
              </div>
              {boardExpanded ? (
                <div className="mt-3">
                  <SoRModuleGrid routes={investorBoardRoutes} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-6" data-product-surface-hub={persona}>
          <ActivationHubSection
            sectionId="core"
            titleKey="productSurface.coreSectionTitle"
            leadKey="productSurface.coreSectionLead"
            routes={surface.core}
          />
          <ActivationHubSection
            sectionId="extended"
            titleKey="productSurface.extendedSectionTitle"
            leadKey="productSurface.extendedSectionLead"
            routes={surface.extended}
            defaultCollapsed
          />
          <ActivationHubSection
            sectionId="pilot-preview"
            titleKey="productSurface.pilotPreviewSectionTitle"
            leadKey="productSurface.pilotPreviewSectionLead"
            routes={surface.pilotPreview}
            defaultCollapsed
          />
          <ActivationHubSection
            sectionId="coming-soon-paused"
            titleKey="productSurface.comingSoonPausedSectionTitle"
            leadKey="productSurface.comingSoonPausedSectionLead"
            routes={surface.comingSoonPaused}
            defaultCollapsed
          />
        </div>
      )}
      {children}
    </section>
  );
}
