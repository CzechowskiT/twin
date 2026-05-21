import Link from "next/link";

import { LandingStoryJourney } from "@/components/marketing/landing-story-journey";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { MvpLiveStatsStrip } from "@/components/marketing/mvp-live-stats-strip";
import { Shell } from "@/components/ui";

/** US-C001: explain product flow before signup. */
export default function HowItWorksPage() {
  return (
    <MarketingPageSurface>
      <Shell wide>
        <div className="py-10 sm:py-14">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
          How it works
        </p>
        <h1 className="marketing-gradient-heading mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          From profile to acceptance-ready calendar — not inbox spam
        </h1>
        <p className="marketing-copy-rail mt-4 max-w-2xl text-[var(--twin-muted-strong)]">
          TWIN matches while you are away, applies with your consent on supported boards, and lands interviews on
          calendars you already use.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register/candidate"
            className="marketing-cta-filled-pill marketing-btn-primary-shadow twin-touch-target inline-flex items-center px-5 text-sm font-semibold"
          >
            Get started
          </Link>
          <Link href="/demo" className="twin-btn-secondary twin-touch-target inline-flex items-center px-4 text-sm">
            Watch demo
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
