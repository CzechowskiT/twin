"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { LandingStoryJourney } from "@/components/marketing/landing-story-journey";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { MvpLiveStatsStrip } from "@/components/marketing/mvp-live-stats-strip";
import { Shell } from "@/components/ui";

/** US-C001: explain product flow before signup (fully i18n). */
export default function HowItWorksPage() {
  const { t } = useTranslation();

  return (
    <MarketingPageSurface>
      <Shell wide>
        <div className="py-10 sm:py-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
            {t("marketingHowItWorks.eyebrow")}
          </p>
          <h1 className="marketing-gradient-heading mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("marketingHowItWorks.title")}
          </h1>
          <p className="marketing-copy-rail mt-4 max-w-2xl text-[var(--twin-muted-strong)]">
            {t("marketingHowItWorks.lead")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register/candidate"
              className="marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex items-center px-5 text-sm font-semibold"
            >
              {t("marketingHowItWorks.ctaStart")}
            </Link>
            <Link href="/demo" className="twin-btn-secondary twin-touch-target inline-flex items-center px-4 text-sm">
              {t("marketingHowItWorks.ctaDemo")}
            </Link>
          </div>
          <div className="mt-10">
            <MvpLiveStatsStrip />
          </div>
        </div>
      </Shell>
      <LandingStoryJourney />
    </MarketingPageSurface>
  );
}
