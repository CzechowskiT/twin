"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

/** Fluently-style “pick your goals” band: clear hierarchy + pill choices + single primary CTA. */
export function LandingFocusChips() {
  const { t } = useTranslation();
  const chips = [
    t("home.focusChipDiscover"),
    t("home.focusChipMatch"),
    t("home.focusChipTrack"),
    t("home.focusChipAuto"),
  ];

  return (
    <section className="border-t border-[var(--twin-border)] bg-gradient-to-b from-[var(--twin-surface-raised)]/35 via-[var(--background)] to-[var(--background)] py-20 sm:py-24 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal delayMs={30}>
          <h2 className="max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl md:text-4xl">
            {t("home.focusTitle")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--twin-muted)] sm:text-lg">
            {t("home.focusSubtitle")}
          </p>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--twin-muted)]">
            {t("home.focusPickLabel")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5 sm:gap-3">
            {chips.map((label) => (
              <Link
                key={label}
                href="/register"
                className="twin-touch-target inline-flex items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-4 py-2.5 text-center text-sm font-medium text-[var(--twin-muted-strong)] shadow-sm transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)] hover:text-[var(--twin-link-hover)] sm:px-5"
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="mt-10">
            <Link
              href="/register"
              className="marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[3rem] items-center justify-center rounded-full bg-[var(--twin-cta)] px-10 text-center text-[15px] font-semibold text-[var(--twin-on-cta)] transition hover:bg-[var(--twin-cta-hover)] active:scale-[0.98]"
            >
              {t("home.focusCta")}
            </Link>
          </div>
          <p className="mt-6 max-w-2xl text-xs leading-relaxed text-[var(--twin-muted)] sm:text-sm">{t("home.focusFootnote")}</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
