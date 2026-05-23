"use client";

import { LandingAudienceSections } from "@/components/marketing/landing-audience-sections";
import { LandingBento } from "@/components/marketing/landing-bento";
import { LandingCtaBand } from "@/components/marketing/landing-cta-band";
import { LandingFaq } from "@/components/marketing/landing-faq";
import { LandingFocusChips } from "@/components/marketing/landing-focus-chips";
import { DemoLiveSnapshot } from "@/components/marketing/demo-live-snapshot";
import { LandingHero } from "@/components/marketing/landing-hero";
import { MvpLiveStatsStrip } from "@/components/marketing/mvp-live-stats-strip";
import { LandingOriginStory } from "@/components/marketing/landing-origin";
import { LandingStoryJourney } from "@/components/marketing/landing-story-journey";
import { LandingVacationTest } from "@/components/marketing/landing-vacation-test";
import { PageMomentumRail } from "@/components/page-momentum-rail";

export default function Home() {
  return (
    <div className="marketing-journey-host relative z-0 flex flex-1 flex-col">
      <div className="relative z-10 flex flex-1 flex-col">
        <LandingHero />
        <div className="mx-auto w-full max-w-6xl space-y-8 px-4 sm:px-6">
          <DemoLiveSnapshot fullDemoHref="/demo" />
          <MvpLiveStatsStrip />
        </div>
        <LandingVacationTest />
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
