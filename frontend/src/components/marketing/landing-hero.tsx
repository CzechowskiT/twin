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
        <p className="mt-5 max-w-3xl text-[1.05rem] font-semibold leading-snug tracking-[-0.02em] text-[var(--foreground)] sm:mt-6 sm:text-xl sm:leading-snug">
          {t("home.heroHook")}
        </p>
        <p className="marketing-copy-rail marketing-hero-lede mt-6 sm:mt-8">{t("home.description")}</p>
        <div className="mt-12 flex flex-col gap-3 sm:mt-14 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Link
            href="/demo"
            className="marketing-hero-btn-cta marketing-btn-primary-shadow twin-touch-target transition duration-200"
          >
            {t("home.ctaDemo")}
          </Link>
          <Link href="/dashboard" className="marketing-hero-btn-twin twin-touch-target transition duration-200">
            {t("home.twinForYourJob")}
          </Link>
          <Link
            href="/waitlist"
            className="marketing-hero-btn-signin twin-touch-target border border-[var(--twin-border)] transition duration-200"
          >
            {t("home.joinWishlist")}
          </Link>
          <Link
            href="/register"
            className="marketing-hero-btn-signin twin-touch-target border border-[var(--twin-border)] transition duration-200 sm:order-last"
          >
            {t("home.getStarted")}
          </Link>
          <Link href="/login" className="marketing-hero-btn-signin twin-touch-target transition duration-200">
            {t("home.logIn")}
          </Link>
        </div>
        <p className="marketing-copy-rail mt-4 max-w-2xl text-sm text-[var(--twin-muted-strong)]">{t("home.ctaDemoHint")}</p>
      </ScrollReveal>
    </section>
  );
}
