"use client";

import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { useTranslation } from "@/components/language-provider";

/** Visual bridge to the global company marquee in site chrome. */
export function LandingTrustCue() {
  const { t } = useTranslation();
  return (
    <section className="landing-trust-cue py-6 sm:py-8" aria-hidden={false}>
      <ScrollReveal>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--twin-muted)]">
          {t("home.socialProofEyebrow")}
        </p>
        <div className="mx-auto mt-4 h-px max-w-md bg-gradient-to-r from-transparent via-[var(--twin-accent)]/45 to-transparent" />
      </ScrollReveal>
    </section>
  );
}
