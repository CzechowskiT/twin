"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import type { TranslationKey } from "@/lib/i18n";

const CARDS: { titleKey: TranslationKey; metaKey: TranslationKey; score: string }[] = [
  { titleKey: "home.teaserCard1Title", metaKey: "home.teaserCard1Meta", score: "92" },
  { titleKey: "home.teaserCard2Title", metaKey: "home.teaserCard2Meta", score: "88" },
  { titleKey: "home.teaserCard3Title", metaKey: "home.teaserCard3Meta", score: "85" },
];

/** Blurred illustrative match preview — not real scraped data. */
export function LandingRegisterTeaser() {
  const { t } = useTranslation();

  return (
    <section className="landing-register-teaser border-t border-[var(--twin-border)]/60 py-16 sm:py-20" aria-labelledby="landing-teaser-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
            {t("home.teaserEyebrow")}
          </p>
          <h2 id="landing-teaser-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            {t("home.teaserTitle")}
          </h2>
        </ScrollReveal>

        <div className="landing-register-teaser__frame relative mt-10 overflow-hidden rounded-2xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/80">
          <ul className="landing-register-teaser__preview list-none space-y-3 p-5 sm:p-6" aria-hidden>
            {CARDS.map((card) => (
              <li
                key={card.titleKey}
                className="flex items-start gap-3 rounded-xl border border-[var(--twin-border)]/70 bg-[var(--twin-surface)]/90 px-4 py-3"
              >
                <span className="twin-badge shrink-0 tabular-nums">{card.score}%</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{t(card.titleKey)}</p>
                  <p className="mt-0.5 text-xs text-[var(--twin-muted)]">{t(card.metaKey)}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="landing-register-teaser__overlay absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--twin-accent)]">
              {t("home.teaserUnlock")}
            </p>
            <Link
              href="/register"
              className="section-cta-primary marketing-btn-primary-shadow twin-touch-target px-7 text-sm"
            >
              {t("home.getStarted")}
            </Link>
            <p className="max-w-xs text-xs text-[var(--twin-muted-strong)]">{t("home.ctaRegisterMicro")}</p>
          </div>
        </div>
        <p className="mt-3 text-center text-[10px] text-[var(--twin-muted)]">{t("home.footerHint")}</p>
      </div>
    </section>
  );
}
