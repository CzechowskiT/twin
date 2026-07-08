"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { CandidateRewardsBand } from "@/components/marketing/candidate-rewards-band";
import { CompanyWorkspacePreview } from "@/components/marketing/company-workspace-preview";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { TalentPoolPreview } from "@/components/marketing/talent-pool-preview";
import { getPersonaBundle, type PersonaId } from "@/lib/persona-pages";
import { COMPANY_ENTRY_MARKERS } from "@/lib/company-entry-navigation";

export function PersonaMarketingPage({ persona }: { persona: PersonaId }) {
  const { locale, t } = useTranslation();
  const c = getPersonaBundle(persona, locale);

  return (
    <MarketingPageSurface wide withCard={false}>
      <div className="marketing-copy-rail space-y-14 sm:space-y-16">
        <header className={`space-y-4 text-start ${c.stackedCta ? "marketing-hero-rail" : ""}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">{c.heroEyebrow}</p>
          <h1 className="marketing-gradient-heading max-w-4xl text-2xl sm:text-3xl md:text-4xl">{c.heroTitle}</h1>
          <p className="max-w-3xl text-base leading-relaxed text-[var(--twin-muted-strong)] sm:text-lg">{c.heroLead}</p>
          {persona === "recruiters" || persona === "companies" ? (
            <p className="max-w-3xl text-xs leading-relaxed text-[var(--twin-muted)]">{t("persona.marketingLimitedLaunchFootnote")}</p>
          ) : null}
          {c.stackedCta ? (
            <div className="marketing-cta-stack pt-2">
              <Link
                href={c.primaryCta.href}
                data-testid={persona === "companies" ? COMPANY_ENTRY_MARKERS.heroDashboard : undefined}
                className="section-cta-primary marketing-btn-primary-shadow twin-touch-target w-full max-w-md"
              >
                {c.primaryCta.label}
              </Link>
              <Link
                href={c.stackedCta.href}
                data-testid={persona === "companies" ? COMPANY_ENTRY_MARKERS.heroTalentPool : undefined}
                className="marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full bg-[var(--twin-accent)] px-6 text-sm font-semibold text-[var(--twin-on-accent)] transition hover:bg-[var(--twin-accent-hover)] active:scale-[0.98]"
              >
                {c.stackedCta.label}
              </Link>
              {c.secondaryCta ? (
                <Link
                  href={c.secondaryCta.href}
                  data-testid={persona === "companies" ? COMPANY_ENTRY_MARKERS.heroCalculator : undefined}
                  className="twin-touch-target inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-6 text-sm font-semibold text-[var(--twin-muted-strong)] shadow-sm transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)] active:scale-[0.98]"
                >
                  {c.secondaryCta.label}
                </Link>
              ) : null}
              {c.supplementaryCtas?.map((cta, idx) => (
                <Link
                  key={cta.href}
                  href={cta.href}
                  data-testid={
                    persona === "companies"
                      ? idx === 0
                        ? COMPANY_ENTRY_MARKERS.heroWishlist
                        : COMPANY_ENTRY_MARKERS.heroContact
                      : undefined
                  }
                  className="twin-touch-target inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-6 text-sm font-semibold text-[var(--twin-muted-strong)] shadow-sm transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)] active:scale-[0.98]"
                >
                  {cta.label}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={c.primaryCta.href}
                className="section-cta-primary marketing-btn-primary-shadow twin-touch-target"
              >
                {c.primaryCta.label}
              </Link>
              {c.secondaryCta ? (
                <Link href={c.secondaryCta.href} className="section-cta-secondary twin-touch-target">
                  {c.secondaryCta.label}
                </Link>
              ) : null}
            </div>
          )}
        </header>

        {persona === "candidates" ? <CandidateRewardsBand variant="persona" /> : null}

        <section aria-labelledby="persona-capabilities" className="text-start">
          <h2 id="persona-capabilities" className="twin-section-title text-lg sm:text-xl">
            {t("persona.sectionCapabilities")}
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-3">
            {c.pillars.map((p) => (
              <li
                key={p.title}
                className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 p-4 sm:p-5"
              >
                <h3 className="text-base font-semibold text-[var(--foreground)]">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {c.growthLane ? (
          <section id="growth-post-offer" className="scroll-mt-24" aria-labelledby="persona-growth-lane">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {c.growthLane.eyebrow}
            </p>
            <h2 id="persona-growth-lane" className="twin-page-intro twin-section-title mt-3 max-w-4xl text-lg sm:text-xl">
              {c.growthLane.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
              {c.growthLane.lead}
            </p>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {c.growthLane.items.map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/90 p-4 sm:p-5"
                >
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--twin-muted-strong)]">{item.body}</p>
                </li>
              ))}
            </ul>
            <p className="twin-muted mt-4 max-w-3xl text-xs leading-relaxed">{t("persona.growthRoadmapFootnote")}</p>
          </section>
        ) : null}

        {persona === "recruiters" || persona === "companies" ? (
          <TalentPoolPreview />
        ) : null}

        {persona === "companies" ? <CompanyWorkspacePreview /> : null}

        <section aria-labelledby="persona-pricing" className="text-start">
          <h2 id="persona-pricing" className="twin-section-title text-lg sm:text-xl">
            {c.pricingTitle}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">{c.pricingLead}</p>
          <ul className="mt-8 grid items-stretch gap-5 lg:grid-cols-3">
            {c.tiers.map((tier) => (
              <li
                key={tier.id}
                className={`flex min-h-0 flex-col rounded-2xl border p-5 sm:p-6 ${
                  tier.highlight
                    ? "border-[var(--twin-accent)] bg-[var(--twin-surface-raised)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--twin-accent)_35%,transparent)]"
                    : "border-[var(--twin-border)] bg-[var(--twin-surface-raised)]"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">{tier.name}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{tier.price}</p>
                <p className="text-sm text-[var(--twin-muted-strong)]">{tier.cadence}</p>
                {tier.quotaSummary ? (
                  <p className="mt-2 text-xs font-medium leading-snug text-[var(--twin-accent)]">{tier.quotaSummary}</p>
                ) : null}
                <ul
                  className={`mt-4 flex-1 space-y-2 ${
                    tier.bullets.length > 6 ? "text-xs leading-relaxed" : "text-sm"
                  } text-[var(--twin-muted-strong)]`}
                >
                  {tier.bullets.map((b, idx) => {
                    const isIncludes = /^(Everything in|Wszystko z|Wszystko ze)/i.test(b);
                    return (
                      <li
                        key={`${tier.id}-${idx}`}
                        className={isIncludes ? "font-semibold text-[var(--foreground)]" : "flex gap-2"}
                      >
                        {isIncludes ? (
                          <span>{b}</span>
                        ) : (
                          <>
                            <span
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--twin-accent)]"
                              aria-hidden
                            />
                            <span>{b}</span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <Link
                  href={tier.href}
                  className={`twin-touch-target mt-6 w-full ${
                    tier.highlight ? "section-cta-primary marketing-btn-primary-shadow" : "section-cta-secondary"
                  }`}
                >
                  {tier.cta}
                </Link>
              </li>
            ))}
          </ul>
          <p className="twin-muted mt-4 max-w-3xl text-xs leading-relaxed">{c.pricingFootnote}</p>
        </section>

        <section aria-labelledby="persona-logistics" className="text-start">
          <h2 id="persona-logistics" className="twin-section-title text-lg sm:text-xl">
            {t("persona.sectionLogistics")}
          </h2>
          <ul className="mt-4 max-w-3xl list-inside list-disc space-y-2 text-sm text-[var(--twin-muted-strong)] sm:text-base">
            {c.logistics.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </MarketingPageSurface>
  );
}
