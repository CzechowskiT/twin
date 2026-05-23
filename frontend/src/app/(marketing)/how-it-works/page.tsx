"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { LandingStoryJourney } from "@/components/marketing/landing-story-journey";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { MvpLiveStatsStrip } from "@/components/marketing/mvp-live-stats-strip";
import { Shell } from "@/components/ui";

/** US-C001: explain product flow before signup (fully i18n). */
export default function HowItWorksPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
        <MarketingPageHeader
          eyebrow={t("marketingHowItWorks.eyebrow")}
          title={t("marketingHowItWorks.title")}
          lead={t("marketingHowItWorks.lead")}
        >
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/register/candidate" className="section-cta-primary marketing-btn-primary-shadow twin-touch-target">
              {t("marketingHowItWorks.ctaStart")}
            </Link>
            <Link href="/demo" className="section-cta-secondary twin-touch-target">
              {t("marketingHowItWorks.ctaDemo")}
            </Link>
          </div>
        </MarketingPageHeader>
        <div className="mt-10">
          <MvpLiveStatsStrip />
        </div>
        <LandingStoryJourney />
      </MarketingPageSurface>
    </Shell>
  );
}
