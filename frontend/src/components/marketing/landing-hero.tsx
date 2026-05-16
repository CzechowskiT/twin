"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export function LandingHero() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col justify-center px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-20 md:min-h-[100svh] md:max-h-[1200px] md:pb-24 md:pt-20">
      <ScrollReveal>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--twin-muted)] sm:text-[11px]">
          {t("home.tagline")}
        </p>
        <h1 className="marketing-gradient-heading mt-6 max-w-4xl text-[2.35rem] font-semibold leading-[1.06] tracking-[-0.04em] sm:mt-8 sm:text-5xl sm:leading-[1.04] md:text-6xl md:leading-[1.02]">
          {t("home.title")}
        </h1>
        <p className="mt-8 max-w-2xl rounded-2xl border-2 border-neutral-200/95 bg-white px-5 py-5 text-base font-medium leading-relaxed text-[var(--foreground)] shadow-[0_12px_40px_rgb(0_0_0_/0.12)] sm:mt-10 sm:rounded-3xl sm:px-6 sm:py-6 sm:text-lg sm:leading-relaxed">
          {t("home.description")}
        </p>
        <div className="mt-12 flex flex-col gap-3 sm:mt-14 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link
            href="/dashboard"
            className="twin-touch-target inline-flex min-h-[3rem] items-center justify-center rounded-full bg-[var(--twin-accent)] px-9 text-center text-[15px] font-bold tracking-tight text-white shadow-[var(--twin-shadow-md)] transition duration-200 hover:bg-[var(--twin-accent-hover)] active:scale-[0.98]"
          >
            {t("home.twinForYourJob")}
          </Link>
          <Link
            href="/register"
            className="marketing-btn-primary-shadow twin-touch-target inline-flex min-h-[3rem] items-center justify-center rounded-full bg-[var(--twin-cta)] px-9 text-center text-[15px] font-semibold text-white transition duration-200 hover:bg-[var(--twin-cta-hover)] active:scale-[0.98]"
          >
            {t("home.getStarted")}
          </Link>
          <Link
            href="/login"
            className="twin-touch-target inline-flex min-h-[3rem] items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-card)] px-9 text-center text-[15px] font-semibold text-[var(--twin-muted-strong)] shadow-sm transition duration-200 hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)] active:scale-[0.98]"
          >
            {t("home.logIn")}
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
