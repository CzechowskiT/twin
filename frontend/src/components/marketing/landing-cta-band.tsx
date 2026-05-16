"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { BentoSpotlight } from "@/components/marketing/bento-spotlight";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export function LandingCtaBand() {
  const { t } = useTranslation();
  return (
    <section className="border-t border-[var(--twin-border)] py-24 sm:py-28 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal delayMs={80}>
          <BentoSpotlight className="flex flex-col items-start justify-between gap-8 p-8 sm:flex-row sm:items-center sm:p-10">
            <div className="max-w-lg">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
                {t("home.tagline")}
              </p>
              <p className="mt-3 text-lg font-medium tracking-[-0.02em] text-[var(--twin-muted-strong)] sm:text-xl">
                {t("home.featuresSubtitle")}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/dashboard"
                className="twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-[var(--twin-accent)] px-7 text-center text-sm font-bold tracking-tight text-white shadow-[var(--twin-shadow-md)] transition hover:bg-[var(--twin-accent-hover)] active:scale-[0.98]"
              >
                {t("home.twinForYourJob")}
              </Link>
              <Link
                href="/register"
                className="marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-[var(--twin-cta)] px-7 text-center text-sm font-semibold text-white transition hover:bg-[var(--twin-cta-hover)] active:scale-[0.98]"
              >
                {t("home.getStarted")}
              </Link>
              <Link
                href="/login"
                className="twin-touch-target inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-7 text-center text-sm font-semibold text-[var(--twin-muted-strong)] transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)] active:scale-[0.98]"
              >
                {t("home.logIn")}
              </Link>
            </div>
          </BentoSpotlight>
        </ScrollReveal>
      </div>
    </section>
  );
}
