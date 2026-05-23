"use client";

import { CompanyLogoMarquee } from "@/components/marketing/company-logo-marquee";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { useTranslation } from "@/components/language-provider";

/** Homepage social proof: eyebrow + scrolling company marks (marquee hidden in site chrome on `/`). */
export function LandingTrustCue() {
  const { t } = useTranslation();
  return (
    <section className="landing-trust-cue" aria-labelledby="landing-trust-cue-heading">
      <ScrollReveal>
        <p
          id="landing-trust-cue-heading"
          className="px-4 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--twin-muted)] sm:px-6"
        >
          {t("home.socialProofEyebrow")}
        </p>
        <div className="mx-auto mt-4 h-px max-w-md bg-gradient-to-r from-transparent via-[var(--twin-accent)]/45 to-transparent" />
      </ScrollReveal>
      <CompanyLogoMarquee placement="landing" />
    </section>
  );
}
