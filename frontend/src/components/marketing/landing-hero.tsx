"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export function LandingHero() {
  const { t } = useTranslation();
  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col justify-center px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-16 md:min-h-[min(92svh,880px)] md:pb-20 md:pt-20">
      <ScrollReveal>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--twin-muted)] sm:text-[11px]">
          {t("home.tagline")}
        </p>
        <h1 className="marketing-gradient-heading mt-5 max-w-3xl text-[2.15rem] font-semibold leading-[1.08] tracking-[-0.04em] sm:mt-6 sm:text-5xl sm:leading-[1.05] md:text-[3.25rem]">
          {t("home.title")}
        </h1>
        <p className="mt-4 max-w-xl text-lg font-semibold leading-snug tracking-[-0.02em] text-[var(--foreground)] sm:mt-5 sm:text-xl">
          {t("home.heroHook")}
        </p>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">{t("home.description")}</p>

        <div className="mt-10 flex flex-col gap-4 sm:mt-12">
          <Link
            href="/demo"
            className="landing-hero-demo-cta marketing-hero-btn-cta marketing-btn-primary-shadow twin-touch-target w-full max-w-sm transition duration-200 sm:w-auto"
          >
            {t("home.ctaDemo")}
          </Link>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              href="/register"
              className="font-semibold text-[var(--twin-accent)] underline-offset-4 hover:underline"
            >
              {t("home.getStarted")}
            </Link>
            <span className="text-[var(--twin-muted)]" aria-hidden>
              ·
            </span>
            <Link href="/login" className="text-[var(--twin-muted-strong)] hover:text-[var(--foreground)]">
              {t("home.logIn")}
            </Link>
          </div>
          <p className="max-w-md text-xs text-[var(--twin-muted)]">{t("home.ctaDemoHint")}</p>
        </div>
      </ScrollReveal>
    </section>
  );
}
