"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { TalentPoolPreview } from "@/components/marketing/talent-pool-preview";
import { Shell } from "@/components/ui";
import { getPersonaBundle, type PersonaId } from "@/lib/persona-pages";

export function PersonaMarketingPage({ persona }: { persona: PersonaId }) {
  const { locale, t } = useTranslation();
  const c = getPersonaBundle(persona, locale);

  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
      <div className="marketing-copy-rail space-y-14 sm:space-y-16">
        <header className="space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">{c.heroEyebrow}</p>
          <h1 className="twin-page-intro twin-section-title max-w-4xl text-2xl sm:text-3xl md:text-4xl">{c.heroTitle}</h1>
          <p className="max-w-3xl text-base leading-relaxed text-[var(--twin-muted-strong)] sm:text-lg">{c.heroLead}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={c.primaryCta.href}
              className="marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-[var(--twin-cta)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--twin-cta-hover)] active:scale-[0.98]"
            >
              {c.primaryCta.label}
            </Link>
            {c.secondaryCta ? (
              <Link
                href={c.secondaryCta.href}
                className="twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-6 text-sm font-semibold text-[var(--twin-muted-strong)] shadow-sm transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)] active:scale-[0.98]"
              >
                {c.secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </header>

        <section aria-labelledby="persona-capabilities">
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

        {persona === "recruiters" || persona === "companies" ? (
          <TalentPoolPreview />
        ) : null}

        <section aria-labelledby="persona-pricing">
          <h2 id="persona-pricing" className="twin-section-title text-lg sm:text-xl">
            {t("persona.sectionPricing")}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">{c.pricingLead}</p>
          <ul className="mt-8 grid gap-5 lg:grid-cols-3">
            {c.tiers.map((tier) => (
              <li
                key={tier.id}
                className={`flex flex-col rounded-2xl border p-5 sm:p-6 ${
                  tier.highlight
                    ? "border-[var(--twin-accent)] bg-[var(--twin-accent-muted)]/35 shadow-[0_12px_40px_rgb(25_60_50_/0.12)]"
                    : "border-[var(--twin-border)] bg-[var(--twin-card)]/70"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">{tier.name}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{tier.price}</p>
                <p className="text-sm text-[var(--twin-muted-strong)]">{tier.cadence}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--twin-muted-strong)]">
                  {tier.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--twin-accent)]" aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`twin-touch-target mt-6 inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full px-4 text-center text-sm font-semibold transition active:scale-[0.98] ${
                    tier.highlight
                      ? "marketing-btn-primary-shadow bg-[var(--twin-cta)] text-white hover:bg-[var(--twin-cta-hover)]"
                      : "border border-[var(--twin-border)] bg-[var(--twin-card)] text-[var(--twin-muted-strong)] hover:border-[var(--twin-border-hover)]"
                  }`}
                >
                  {tier.cta}
                </Link>
              </li>
            ))}
          </ul>
          <p className="twin-muted mt-4 max-w-3xl text-xs leading-relaxed">{c.pricingFootnote}</p>
        </section>

        <section aria-labelledby="persona-logistics">
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
    </Shell>
  );
}
