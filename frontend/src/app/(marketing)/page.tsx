"use client";

import { useTranslation } from "@/components/language-provider";
import { LandingBento } from "@/components/marketing/landing-bento";
import { LandingCtaBand } from "@/components/marketing/landing-cta-band";
import { LandingHero } from "@/components/marketing/landing-hero";
import { MarqueeStrip } from "@/components/marketing/marquee-strip";

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="relative z-0 flex flex-1 flex-col">
      <div className="relative z-10 flex flex-1 flex-col">
        <LandingHero />
        <MarqueeStrip text={t("home.tagline")} />
        <LandingBento />
        <LandingCtaBand />
      </div>
    </div>
  );
}
