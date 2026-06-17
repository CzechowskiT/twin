"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { SystemOfRecordNavigationHub } from "@/components/workspace/system-of-record-navigation-hub";
import { WorkspaceModuleGrid } from "@/components/workspace/workspace-module-grid";
import { FAQ_INVESTOR_HREF } from "@/lib/faq-anchor";
import {
  INVESTOR_ROOM_DEMO_MAP,
  INVESTOR_ROOM_PERSONA_IDS,
  INVESTOR_ROOM_RISK_IDS,
  INVESTOR_ROOM_ROADMAP_IDS,
  INVESTOR_ROOM_STATUS,
  INVESTOR_ROOM_STATUS_ITEM_IDS,
  INVESTOR_ROOM_VISUAL_MARKERS,
  investorRoomPersonaBodyKey,
  investorRoomPersonaTitleKey,
  investorRoomRiskMitigationKey,
  investorRoomRiskTitleKey,
  investorRoomRoadmapKey,
  investorRoomStatusBodyKey,
  investorRoomStatusLabelKey,
  investorRoomStatusTitleKey,
  type InvestorRoomStatusTier,
} from "@/lib/investor-room";
import { INVESTOR_PUBLIC_PREVIEW_MODULES, INVESTOR_WORKSPACE_MODULES } from "@/lib/investor-workspace-modules";
import { Shell } from "@/components/ui";

const DECK_MAIL = "contact@twin.care";

function StatusBadge({ tier }: { tier: InvestorRoomStatusTier }) {
  const { t } = useTranslation();
  const tone =
    tier === "live"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : tier === "demo"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
        : "border-rose-500/40 bg-rose-500/10 text-rose-200";
  return (
    <span
      className={`investor-room-status-badge inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
      data-tier={tier}
    >
      {t(investorRoomStatusLabelKey(tier))}
    </span>
  );
}

function SectionCard({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card)]/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
      <h2 className="twin-section-title text-xl sm:text-2xl">{title}</h2>
      {lead ? <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">{lead}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function CtaPill({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  const base =
    "twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full px-5 text-sm font-semibold transition active:scale-[0.98]";
  if (primary) {
    return (
      <Link
        href={href}
        className={`${base} marketing-cta-filled-pill marketing-btn-primary-shadow bg-[var(--twin-cta)] text-[var(--twin-on-cta)] hover:bg-[var(--twin-cta-hover)]`}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} border border-[var(--twin-border)] bg-[var(--twin-card)] text-[var(--twin-muted-strong)] shadow-sm hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)]`}
    >
      {children}
    </Link>
  );
}

/** Public investor room — honest executive view aligned with production reality matrices. */
export function InvestorRoomPage() {
  const { t } = useTranslation();
  const deckHref = `mailto:${DECK_MAIL}?subject=${encodeURIComponent(t("investorRoom.contactMailSubject"))}`;

  const statusByTier = {
    live: INVESTOR_ROOM_STATUS_ITEM_IDS.filter((id) => INVESTOR_ROOM_STATUS[id] === "live"),
    demo: INVESTOR_ROOM_STATUS_ITEM_IDS.filter((id) => INVESTOR_ROOM_STATUS[id] === "demo"),
    notLive: INVESTOR_ROOM_STATUS_ITEM_IDS.filter((id) => INVESTOR_ROOM_STATUS[id] === "notLive"),
  };

  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
        <div
          className={`${INVESTOR_ROOM_VISUAL_MARKERS.page} marketing-copy-rail space-y-10 sm:space-y-12`}
          data-testid="investor-room-page"
        >
          <header className="space-y-4 text-start">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("investorRoom.eyebrow")}
            </p>
            <h1 className="twin-page-intro twin-section-title max-w-4xl text-2xl sm:text-3xl md:text-4xl">
              {t("investorRoom.title")}
            </h1>
            <p className="max-w-3xl text-lg font-medium text-[var(--twin-fg)]">{t("investorRoom.thesis")}</p>
            <p className="max-w-3xl text-base leading-relaxed text-[var(--twin-muted-strong)]">{t("investorRoom.lead")}</p>
          </header>

          <div
            className={`${INVESTOR_ROOM_VISUAL_MARKERS.launchStanceBanner} rounded-2xl border border-rose-500/30 bg-rose-950/40 p-5 sm:p-6`}
            data-testid="investor-room-launch-stance"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-200">{t("investorRoom.launchStanceTitle")}</h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-rose-100/90">{t("investorRoom.launchStanceBody")}</p>
          </div>

          <section
            className="rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-card)]/80 p-6 shadow-sm backdrop-blur-sm sm:p-8"
            data-testid="investor-gated-preview"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("workspaceModules.investorPreviewEyebrow")}
            </p>
            <h2 className="twin-section-title mt-2 text-xl sm:text-2xl">{t("workspaceModules.investorHubTitle")}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              {t("workspaceModules.investorPreviewLead")}
            </p>
            <div className="mt-6">
              <WorkspaceModuleGrid modules={[...INVESTOR_PUBLIC_PREVIEW_MODULES, ...INVESTOR_WORKSPACE_MODULES.slice(0, 3)]} />
            </div>
          </section>

          <div className="mt-8" data-testid="investor-sor-proof-hub">
            <SystemOfRecordNavigationHub
              persona="investor"
              titleKey="workspaceModules.investorHubTitle"
              leadKey="systemOfRecord.investorHubLead"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title={t("investorRoom.problemTitle")}>
              <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("investorRoom.problemBody")}</p>
            </SectionCard>
            <SectionCard title={t("investorRoom.wedgeTitle")}>
              <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("investorRoom.wedgeBody")}</p>
            </SectionCard>
          </div>

          <SectionCard title={t("investorRoom.personasTitle")} lead={t("investorRoom.personasLead")}>
            <ul className="grid gap-4 sm:grid-cols-3">
              {INVESTOR_ROOM_PERSONA_IDS.map((id) => (
                <li
                  key={id}
                  className={`${INVESTOR_ROOM_VISUAL_MARKERS.personaCard} rounded-xl border border-[var(--twin-border)] bg-[var(--twin-bg)]/60 p-4`}
                  data-persona={id}
                >
                  <h3 className="text-sm font-semibold text-[var(--twin-fg)]">{t(investorRoomPersonaTitleKey(id))}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
                    {t(investorRoomPersonaBodyKey(id))}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title={t("investorRoom.demoMapTitle")} lead={t("investorRoom.demoMapLead")}>
            <ul className={`${INVESTOR_ROOM_VISUAL_MARKERS.demoMap} flex flex-wrap gap-3`}>
              {INVESTOR_ROOM_DEMO_MAP.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-[2.5rem] items-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-bg)]/50 px-4 text-sm font-medium text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-accent)] hover:text-[var(--twin-fg)]"
                  >
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>

          <div
            className={INVESTOR_ROOM_VISUAL_MARKERS.statusSection}
            data-testid="investor-room-status"
          >
            <SectionCard title={t("investorRoom.statusTitle")} lead={t("investorRoom.statusLead")}>
              <div className="space-y-8">
                {(["live", "demo", "notLive"] as const).map((tier) => {
                  const sectionKey =
                    tier === "live"
                      ? "investorRoom.statusSectionLive"
                      : tier === "demo"
                        ? "investorRoom.statusSectionDemo"
                        : "investorRoom.statusSectionNotLive";
                  const ids = statusByTier[tier];
                  if (!ids.length) return null;
                  return (
                    <div key={tier} data-status-tier={tier}>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--twin-accent)]">
                        {t(sectionKey)}
                      </h3>
                      <ul className="mt-4 space-y-3">
                        {ids.map((id) => (
                          <li
                            key={id}
                            className="flex flex-col gap-2 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-bg)]/40 p-4 sm:flex-row sm:items-start sm:justify-between"
                            data-status-item={id}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[var(--twin-fg)]">
                                {t(investorRoomStatusTitleKey(id))}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
                                {t(investorRoomStatusBodyKey(id))}
                              </p>
                            </div>
                            <StatusBadge tier={tier} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          <SectionCard title={t("investorRoom.roadmapTitle")} lead={t("investorRoom.roadmapLead")}>
            <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              {INVESTOR_ROOM_ROADMAP_IDS.map((id) => (
                <li key={id}>{t(investorRoomRoadmapKey(id))}</li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard title={t("investorRoom.risksTitle")} lead={t("investorRoom.risksLead")}>
            <ul className="space-y-4">
              {INVESTOR_ROOM_RISK_IDS.map((id) => (
                <li key={id} className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-bg)]/40 p-4">
                  <p className="text-sm font-semibold text-[var(--twin-fg)]">{t(investorRoomRiskTitleKey(id))}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--twin-muted-strong)]">
                    {t(investorRoomRiskMitigationKey(id))}
                  </p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title={t("investorRoom.contactTitle")} lead={t("investorRoom.contactLead")}>
            <div className="flex flex-wrap gap-3">
              <CtaPill href={deckHref} primary>
                {t("investorRoom.contactCta")}
              </CtaPill>
              <CtaPill href={FAQ_INVESTOR_HREF}>{t("investorRoom.contactFaq")}</CtaPill>
              <CtaPill href="/workspace/investor">{t("investorRoom.contactWorkspace")}</CtaPill>
            </div>
          </SectionCard>

          <p className="max-w-3xl text-xs leading-relaxed text-[var(--twin-muted)]">{t("investorRoom.footerNote")}</p>
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}
