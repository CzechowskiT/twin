"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { FoundingCounterStrip } from "@/components/marketing/founding-counter-strip";
import { FoundingOfferPreview } from "@/components/marketing/founding-offer-preview";
import { InteractiveDemoCta } from "@/components/marketing/interactive-demo-cta";
import { LandingLiveProof } from "@/components/marketing/landing-live-proof";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export function LandingHero() {
  const { t } = useTranslation();
  return (
    <section className="marketing-section-hero marketing-home-rail relative flex w-full flex-col justify-center pb-12 pt-14 sm:pb-16 sm:pt-16 md:min-h-[min(92svh,880px)] md:pb-20 md:pt-20">
      <ScrollReveal>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(20rem,34%)] lg:items-start lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_min(24rem,36%)] xl:gap-x-12">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--twin-accent)] sm:text-[11px]">
              {t("home.curiosityEyebrow")}
            </p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--twin-muted)] sm:text-[11px]">
              {t("home.tagline")}
            </p>
            <h1 className="marketing-gradient-heading marketing-home-headline mt-5 text-[2.15rem] font-semibold leading-[1.08] tracking-[-0.04em] sm:mt-6 sm:text-5xl sm:leading-[1.05] md:text-[3.25rem]">
              {t("home.title")}
            </h1>
            <p className="marketing-home-lede mt-4 text-lg font-semibold leading-snug tracking-[-0.02em] text-[var(--foreground)] sm:mt-5 sm:text-xl">
              {t("home.heroHook")}
            </p>
            <p className="marketing-home-lede mt-3 text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
              {t("home.description")}
            </p>
          </div>

          <aside className="mt-8 min-w-0 lg:mt-14">
            <FoundingOfferPreview />
            <FoundingCounterStrip className="mt-4" />
          </aside>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
            <div className="flex min-w-0 flex-col gap-2 sm:max-w-[min(100%,20rem)]">
              <Link
                href="/waitlist"
                className="twin-header-cta twin-nav-waitlist-pill landing-hero-wishlist-cta marketing-hero-btn-cta twin-touch-target w-full transition duration-200 sm:w-auto"
              >
                {t("home.joinWishlist")}
              </Link>
              <p className="text-xs font-medium text-[var(--twin-muted-strong)]">{t("home.joinWishlistMicro")}</p>
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:max-w-[min(100%,20rem)]">
              <Link
                href="/register"
                className="landing-hero-register-cta section-cta-secondary marketing-hero-btn-cta twin-touch-target w-full transition duration-200 sm:w-auto"
              >
                {t("home.getStarted")}
              </Link>
              <p className="text-xs font-medium text-[var(--twin-accent)]">{t("home.ctaRegisterMicro")}</p>
            </div>
          </div>
          <InteractiveDemoCta className="mt-1 max-w-xl" />
        </div>

        <LandingLiveProof className="marketing-home-lede mt-10 border-t border-[var(--twin-border)]/60 pt-8" />
      </ScrollReveal>
    </section>
  );
}
