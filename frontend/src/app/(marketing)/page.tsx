"use client";

import { LandingAmbient } from "@/components/marketing/landing-ambient";
import { LandingBento } from "@/components/marketing/landing-bento";
import { LandingCtaBand } from "@/components/marketing/landing-cta-band";
import { LandingFaq } from "@/components/marketing/landing-faq";
import { LandingFeatureGrid } from "@/components/marketing/landing-feature-grid";
import { DemoLiveSnapshot } from "@/components/marketing/demo-live-snapshot";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingHomeStats } from "@/components/marketing/landing-home-stats";
import { LandingHowItWorks } from "@/components/marketing/landing-how-it-works";
import { LandingInsideSteps } from "@/components/marketing/landing-inside-steps";
import { LandingRegisterTeaser } from "@/components/marketing/landing-register-teaser";
import { LandingStickyCta } from "@/components/marketing/landing-sticky-cta";
import { LandingTrustCue } from "@/components/marketing/landing-trust-cue";
import { PageMomentumRail } from "@/components/page-momentum-rail";

export default function Home() {
  return (
    <div className="marketing-journey-host relative z-0 flex flex-1 flex-col">
      <LandingAmbient />
      <div className="relative z-10 flex flex-1 flex-col">
        <LandingHero />
        <LandingTrustCue />
        <div className="mx-auto w-full max-w-6xl space-y-2 px-4 sm:px-6">
          <LandingHomeStats />
          <DemoLiveSnapshot fullDemoHref="/demo" />
        </div>
        <LandingRegisterTeaser />
        <LandingInsideSteps />
        <LandingHowItWorks />
        <LandingFeatureGrid />
        <LandingBento />
        <LandingFaq />
        <LandingCtaBand />
        <LandingStickyCta />
        <PageMomentumRail variant="marketing" />
      </div>
    </div>
  );
}
