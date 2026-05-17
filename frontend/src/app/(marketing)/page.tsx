"use client";

import { LandingAudienceSections } from "@/components/marketing/landing-audience-sections";
import { LandingBento } from "@/components/marketing/landing-bento";
import { LandingCtaBand } from "@/components/marketing/landing-cta-band";
import { LandingFaq } from "@/components/marketing/landing-faq";
import { LandingFocusChips } from "@/components/marketing/landing-focus-chips";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingOriginStory } from "@/components/marketing/landing-origin";
import { LandingStoryJourney } from "@/components/marketing/landing-story-journey";
import { CompanyLogoMarquee } from "@/components/marketing/company-logo-marquee";
import { PageMomentumRail } from "@/components/page-momentum-rail";

export default function Home() {
  return (
    <div className="marketing-journey-host relative z-0 flex flex-1 flex-col">
      <div className="relative z-10 flex flex-1 flex-col">
        <CompanyLogoMarquee />
        <LandingHero />
        <LandingOriginStory />
        <LandingStoryJourney />
        <LandingAudienceSections />
        <LandingFocusChips />
        <LandingBento />
        <LandingFaq />
        <LandingCtaBand />
        <PageMomentumRail variant="marketing" />
      </div>
    </div>
  );
}
