"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { InteractiveDemoCta } from "@/components/marketing/interactive-demo-cta";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import type { TranslationKey } from "@/lib/i18n";

const STEPS = [1, 2, 3] as const;

export function LandingInsideSteps() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-[var(--twin-border)]/60 py-16 sm:py-20" aria-labelledby="landing-inside-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
            {t("home.insideEyebrow")}
          </p>
          <h2 id="landing-inside-heading" className="mt-2 max-w-2xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            {t("home.insideTitle")}
          </h2>
        </ScrollReveal>

        <ol className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-3">
          {STEPS.map((n, i) => (
            <li key={n}>
              <ScrollReveal delayMs={50 + i * 60} className="h-full">
                <div className="landing-inside-step flex h-full flex-col rounded-2xl border border-[var(--twin-border)]/80 bg-[var(--twin-surface-raised)]/50 p-5">
                  <span className="font-mono text-[11px] font-medium text-[var(--twin-accent)]">0{n}</span>
                  <h3 className="mt-3 text-base font-semibold tracking-[-0.02em]">
                    {t(`home.insideStep${n}Title` as TranslationKey)}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-snug text-[var(--twin-muted-strong)]">
                    {t(`home.insideStep${n}Line` as TranslationKey)}
                  </p>
                </div>
              </ScrollReveal>
            </li>
          ))}
        </ol>

        <ScrollReveal delayMs={120} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href="/waitlist"
              className="twin-header-cta twin-nav-waitlist-pill twin-touch-target px-7 text-sm"
            >
              {t("home.joinWishlist")}
            </Link>
            <Link
              href="/register"
              className="section-cta-secondary twin-touch-target px-7 text-sm"
            >
              {t("home.getStarted")}
            </Link>
          </div>
          <InteractiveDemoCta className="max-w-xl" showSignIn={false} />
        </ScrollReveal>
      </div>
    </section>
  );
}
