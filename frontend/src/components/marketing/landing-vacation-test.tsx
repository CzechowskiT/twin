"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

/** Before / after “Vacation Test” — section `#vacation-test` for home CTAs. */
export function LandingVacationTest() {
  const { t } = useTranslation();

  const without = [t("home.vacationWithout1"), t("home.vacationWithout2"), t("home.vacationWithout3"), t("home.vacationWithout4")];
  const withTwin = [t("home.vacationWith1"), t("home.vacationWith2"), t("home.vacationWith3"), t("home.vacationWith4")];

  return (
    <section
      id="vacation-test"
      className="scroll-mt-28 border-y border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/40 py-16 sm:py-20"
      aria-labelledby="vacation-test-heading"
    >
      <div className="twin-container px-4 sm:px-6">
        <ScrollReveal>
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
            {t("home.vacationTestEyebrow")}
          </p>
          <h2
            id="vacation-test-heading"
            className="marketing-gradient-heading mx-auto mt-4 max-w-3xl text-center text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl"
          >
            {t("home.vacationTestTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-[var(--twin-muted-strong)] sm:text-lg">
            {t("home.vacationTestLead")}
          </p>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2 md:gap-8">
            <div className="rounded-2xl border border-[var(--twin-border)] border-l-4 border-l-amber-600/70 bg-[var(--twin-card)] p-6 shadow-[var(--twin-shadow)]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-900/90">
                {t("home.vacationWithoutLabel")}
              </h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
                {without.map((line, i) => (
                  <li key={`w-${i}`} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 font-bold text-amber-700/80" aria-hidden>
                      ·
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-[var(--twin-border)] pt-4 text-sm font-semibold text-[var(--foreground)]">
                {t("home.vacationResultWithout")}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--twin-border)] border-l-4 border-l-[var(--twin-accent)] bg-[var(--twin-card)] p-6 shadow-[var(--twin-shadow)]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--twin-accent)]">
                {t("home.vacationWithLabel")}
              </h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
                {withTwin.map((line, i) => (
                  <li key={`t-${i}`} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 font-bold text-[var(--twin-accent)]" aria-hidden>
                      ✓
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-[var(--twin-border)] pt-4 text-sm font-semibold text-[var(--foreground)]">
                {t("home.vacationResultWith")}
              </p>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/register"
              className="marketing-hero-btn-cta marketing-btn-primary-shadow twin-touch-target inline-flex min-w-[12rem] items-center justify-center px-8 py-3 text-center text-sm font-semibold transition"
            >
              {t("home.vacationTestCtaRegister")}
            </Link>
            <Link
              href="/for-candidates"
              className="marketing-hero-btn-signin twin-touch-target inline-flex min-w-[12rem] items-center justify-center px-8 py-3 text-center text-sm font-semibold transition"
            >
              {t("nav.forCandidates")}
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
