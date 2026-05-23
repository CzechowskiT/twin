"use client";

import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";

const FEATURE_KEYS = [1, 2, 3, 4, 5, 6] as const;

const ICONS: Record<number, string> = {
  1: "◎",
  2: "◈",
  3: "▣",
  4: "◇",
  5: "◉",
  6: "⬡",
};

export function LandingFeatureGrid() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-[var(--twin-border)]/60 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">TWIN</p>
          <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{t("home.featureGridTitle")}</h2>
        </ScrollReveal>
        <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((n, i) => (
            <ScrollReveal key={n} delayMs={40 + i * 35} className="h-full">
              <li className="flex h-full items-start gap-4 rounded-2xl border border-[var(--twin-border)]/70 bg-[var(--twin-card)]/40 p-5 backdrop-blur-sm transition hover:border-[var(--twin-accent)]/35">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--twin-accent-muted)]/50 text-lg text-[var(--twin-accent)]">
                  {ICONS[n]}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold tracking-[-0.02em]">{t(`home.feature${n}Title` as TranslationKey)}</h3>
                  <p className="mt-1 text-sm leading-snug text-[var(--twin-muted-strong)]">
                    {t(`home.feature${n}Line` as TranslationKey)}
                  </p>
                </div>
              </li>
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
