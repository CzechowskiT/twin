"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { InvestorRoadmapPanel } from "@/components/investor-roadmap-panel";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { MvpLiveStatsStrip } from "@/components/marketing/mvp-live-stats-strip";
import { clearCookieConsent } from "@/lib/cookie-consent";
import { FAQ_INVESTOR_HREF } from "@/lib/faq-anchor";
import { Shell } from "@/components/ui";

const DECK_MAIL = "contact@twin.care";

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

/** Public investor fundraising surface — live metrics, honest roadmap, diligence CTAs. */
export function InvestorFundraisingPage({ ycMode = false }: { ycMode?: boolean }) {
  const { t } = useTranslation();
  const deckHref = `mailto:${DECK_MAIL}?subject=${encodeURIComponent(t("investorFundraising.contactMailSubject"))}`;

  const builtLive = [
    t("investorFundraising.builtLive1"),
    t("investorFundraising.builtLive2"),
    t("investorFundraising.builtLive3"),
    t("investorFundraising.builtLive4"),
    t("investorFundraising.builtLive5"),
  ];
  const builtNext = [
    t("investorFundraising.builtNext1"),
    t("investorFundraising.builtNext2"),
    t("investorFundraising.builtNext3"),
  ];

  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
        <div className="marketing-copy-rail space-y-12 sm:space-y-14">
          {ycMode ? (
            <header className="space-y-3 text-start">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("investorFundraising.ycEyebrow")}
              </p>
              <h1 className="twin-page-intro twin-section-title text-2xl sm:text-3xl">{t("investorFundraising.ycTitle")}</h1>
              <p className="max-w-3xl text-base leading-relaxed text-[var(--twin-muted-strong)]">{t("investorFundraising.ycLead")}</p>
              <ul className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
                <li>
                  <Link href="/demo" className="twin-link">
                    {t("investorFundraising.ycDemo")}
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="twin-link">
                    {t("investorFundraising.ycStatus")}
                  </Link>
                </li>
                <li>
                  <Link href="/developers" className="twin-link">
                    {t("investorFundraising.ycDevelopers")}
                  </Link>
                </li>
                <li>
                  <Link href="/for-investors#traction" className="twin-link">
                    {t("investorFundraising.ycMetrics")}
                  </Link>
                </li>
              </ul>
              <Link href="/for-investors" className="twin-link mt-2 inline-block text-sm">
                {t("investorFundraising.ycBack")}
              </Link>
            </header>
          ) : (
            <header className="space-y-4 text-start">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("investorFundraising.eyebrow")}
              </p>
              <h1 className="twin-page-intro twin-section-title max-w-4xl text-2xl sm:text-3xl md:text-4xl">
                {t("investorFundraising.heroTitle")}
              </h1>
              <p className="max-w-3xl text-base leading-relaxed text-[var(--twin-muted-strong)] sm:text-lg">
                {t("investorFundraising.heroLead")}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <CtaPill href="/investor" primary>
                  {t("investorFundraising.ctaInvestorRoom")}
                </CtaPill>
                <CtaPill href="/investor/product-proof">{t("investorFundraising.ctaProductProof")}</CtaPill>
                <CtaPill href="/demo">{t("investorFundraising.ctaDemo")}</CtaPill>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <CtaPill href="/investor/data-room">{t("investorFundraising.ctaDataRoom")}</CtaPill>
                <CtaPill href={deckHref}>{t("investorFundraising.ctaDeck")}</CtaPill>
                <CtaPill href="/for-investors/yc">{t("investorFundraising.ctaYc")}</CtaPill>
              </div>
            </header>
          )}

          <section id="traction" className="scroll-mt-24 text-start" aria-labelledby="investor-traction-title">
            <h2 id="investor-traction-title" className="twin-section-title text-lg sm:text-xl">
              {t("investorFundraising.tractionTitle")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
              {t("investorFundraising.tractionLead")}
            </p>
            <div className="mt-6">
              <MvpLiveStatsStrip />
            </div>
            <p className="mt-4">
              <Link href="/login/investor" className="twin-link text-sm font-medium">
                {t("investorFundraising.ctaMetrics")} →
              </Link>
            </p>
          </section>

          {!ycMode ? (
            <>
              <section className="text-start" aria-labelledby="investor-built-title">
                <h2 id="investor-built-title" className="twin-section-title text-lg sm:text-xl">
                  {t("investorFundraising.builtTitle")}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                  {t("investorFundraising.builtLead")}
                </p>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-[var(--twin-accent)]">{t("investorFundraising.builtLiveTitle")}</h3>
                    <ul className="mt-3 list-disc space-y-2 ps-4 text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                      {builtLive.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-dashed border-[var(--twin-border)] bg-[var(--twin-surface-2)]/50 p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-[var(--twin-muted-strong)]">{t("investorFundraising.builtNextTitle")}</h3>
                    <ul className="mt-3 list-disc space-y-2 ps-4 text-sm leading-relaxed text-[var(--twin-muted)]">
                      {builtNext.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <InvestorRoadmapPanel />
              </section>

              <section className="text-start" aria-labelledby="investor-security-title">
                <h2 id="investor-security-title" className="twin-section-title text-lg sm:text-xl">
                  {t("investorFundraising.securityTitle")}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                  {t("investorFundraising.securityLead")}
                </p>
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
                  <li>
                    <Link href="/privacy" className="twin-link">
                      {t("investorFundraising.securityPrivacy")}
                    </Link>
                  </li>
                  <li>
                    <button type="button" className="twin-link cursor-pointer" onClick={() => clearCookieConsent()}>
                      {t("investorFundraising.securityCookies")}
                    </button>
                  </li>
                  <li>
                    <Link href="/faq" className="twin-link">
                      {t("investorFundraising.securityPlacementFaq")}
                    </Link>
                  </li>
                  <li>
                    <Link href="/status" className="twin-link">
                      {t("investorFundraising.securityStatus")}
                    </Link>
                  </li>
                </ul>
              </section>

              <section className="text-start" aria-labelledby="investor-dataroom-title">
                <h2 id="investor-dataroom-title" className="twin-section-title text-lg sm:text-xl">
                  {t("investorFundraising.dataRoomTitle")}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                  {t("investorFundraising.dataRoomLead")}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <CtaPill href="/investor/data-room" primary>
                    {t("investorFundraising.ctaDataRoom")}
                  </CtaPill>
                  <CtaPill href={FAQ_INVESTOR_HREF}>{t("investorFundraising.ctaFaq")}</CtaPill>
                </div>
              </section>

              <section className="text-start" aria-labelledby="investor-contact-title">
                <h2 id="investor-contact-title" className="twin-section-title text-lg sm:text-xl">
                  {t("investorFundraising.contactTitle")}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
                  {t("investorFundraising.contactLead")}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <CtaPill href={deckHref} primary>
                    {t("investorFundraising.ctaDeck")}
                  </CtaPill>
                  <CtaPill href="/contact">{t("investorFundraising.contactCta")}</CtaPill>
                </div>
              </section>
            </>
          ) : null}

          <p className="twin-muted border-t border-[var(--twin-border)] pt-6 text-xs leading-relaxed">
            {t("investorFundraising.footerNote")}
          </p>
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}
