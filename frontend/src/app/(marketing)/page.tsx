"use client";

import { LandingBento } from "@/components/marketing/landing-bento";
import { LandingCtaBand } from "@/components/marketing/landing-cta-band";
import { LandingFaq } from "@/components/marketing/landing-faq";
import { LandingFocusChips } from "@/components/marketing/landing-focus-chips";
import { LandingHero } from "@/components/marketing/landing-hero";
import { CompanyLogoMarquee } from "@/components/marketing/company-logo-marquee";

export default function Home() {
  return (
    <div className="relative z-0 flex flex-1 flex-col">
      <div className="relative z-10 flex flex-1 flex-col">
        <LandingHero />
        <CompanyLogoMarquee />
        <LandingFocusChips />
        <LandingBento />
        <LandingFaq />
        <LandingCtaBand />
      </div>
    </div>
  );
}
