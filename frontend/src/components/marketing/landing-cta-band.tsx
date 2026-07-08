"use client";

import Link from "next/link";
import { useTranslation } from "@/components/language-provider";
import { trackEvent } from "@/lib/analytics";
import { BentoSpotlight } from "@/components/marketing/bento-spotlight";
import { FoundingOfferPreview } from "@/components/marketing/founding-offer-preview";
import { InteractiveDemoCta } from "@/components/marketing/interactive-demo-cta";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

export function LandingCtaBand() {
  const { t } = useTranslation();
  return (
    <section className="marketing-section-cta-band border-t border-[var(--twin-border)] py-20 sm:py-24 md:py-28">
      <div className="marketing-home-rail">
        <ScrollReveal delayMs={80}>
          <BentoSpotlight className="flex flex-col items-stretch justify-between gap-8 p-8 sm:p-10 lg:flex-row lg:items-center lg:gap-10">
            <div className="min-w-0 max-w-2xl flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-muted)]">
                {t("home.ctaBandWishlistEyebrow")}
              </p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)] sm:text-xl">
                {t("home.ctaBandWishlistTitle")}
              </p>
              <p className="mt-2 text-xs text-[var(--twin-muted-strong)]">{t("home.ctaBandWishlistMicro")}</p>
              <div className="mt-5">
                <FoundingOfferPreview variant="inline" />
              </div>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-5 lg:max-w-md lg:shrink-0">
              <div className="flex flex-col gap-1.5">
                <Link
                  href="/waitlist"
                  className="twin-header-cta twin-nav-waitlist-pill twin-touch-target px-7 text-sm"
                  onClick={() => trackEvent("waitlist_cta_click", { surface: "home_cta_band" })}
                >
                  {t("home.joinWishlist")}
                </Link>
                <p className="text-center text-[11px] text-[var(--twin-muted)] sm:text-start">{t("home.joinWishlistMicro")}</p>
              </div>
              <Link href="/register" className="twin-link twin-touch-target self-center text-sm font-semibold sm:self-start">
                {t("home.getStarted")}
              </Link>
              <InteractiveDemoCta showSignIn={false} />
            </div>
          </BentoSpotlight>
        </ScrollReveal>
      </div>
    </section>
  );
}
