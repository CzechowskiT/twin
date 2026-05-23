"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { BentoSpotlight } from "@/components/marketing/bento-spotlight";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export function LandingCtaBand() {
  const { t } = useTranslation();
  return (
    <section className="marketing-section-cta-band border-t border-[var(--twin-border)] py-20 sm:py-24 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal delayMs={80}>
          <BentoSpotlight className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center sm:p-10">
            <div className="max-w-md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
                {t("home.ctaBandEyebrow")}
              </p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-xl">
                {t("home.ctaBandTitle")}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/register"
                className="section-cta-primary marketing-btn-primary-shadow twin-touch-target px-7 text-sm"
              >
                {t("home.getStarted")}
              </Link>
              <Link
                href="/how-it-works"
                className="section-cta-secondary twin-touch-target px-7 text-sm"
              >
                {t("home.howDetailLink")}
              </Link>
            </div>
          </BentoSpotlight>
        </ScrollReveal>
      </div>
    </section>
  );
}
