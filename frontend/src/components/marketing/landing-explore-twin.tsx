"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { PUBLIC_EXPLORE_TWIN_ENTRIES } from "@/lib/public-explore-twin-routes";

/** Compact homepage quick-entry panel — bounded copy, existing routes only. */
export function LandingExploreTwin() {
  const { t } = useTranslation();

  return (
    <section
      id="explore-twin"
      className="scroll-mt-24 border-t border-[var(--twin-border)]/60 py-12 sm:py-14"
      aria-labelledby="explore-twin-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
            {t("home.exploreTwinEyebrow")}
          </p>
          <h2 id="explore-twin-heading" className="mt-2 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
            {t("home.exploreTwinTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
            {t("home.exploreTwinLead")}
          </p>
        </ScrollReveal>

        <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PUBLIC_EXPLORE_TWIN_ENTRIES.map((entry, i) => (
            <ScrollReveal key={entry.id} delayMs={30 + i * 25} className="h-full">
              <li className="h-full list-none">
                <Link
                  href={entry.href}
                  className="group flex h-full flex-col rounded-xl border border-[var(--twin-border)]/70 bg-[var(--twin-card)]/50 px-4 py-3.5 transition hover:border-[var(--twin-accent)]/40 hover:bg-[var(--twin-accent-muted)]/25"
                >
                  <span className="text-sm font-semibold tracking-[-0.02em] text-[var(--foreground)] group-hover:text-[var(--twin-link-hover)]">
                    {t(entry.titleKey)}
                  </span>
                  <span className="mt-1 text-xs leading-snug text-[var(--twin-muted-strong)]">{t(entry.hintKey)}</span>
                </Link>
              </li>
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
