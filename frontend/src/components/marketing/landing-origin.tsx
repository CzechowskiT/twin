"use client";

import { useTranslation } from "@/components/language-provider";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";

/** Founder-style genesis: why TWIN exists, before the product “chapters”. */
export function LandingOriginStory() {
  const { t } = useTranslation();

  return (
    <section
      id="story-origin"
      className="scroll-mt-24 border-t border-[var(--twin-border)]/80 bg-[var(--background)] px-4 py-14 sm:px-6 sm:py-20 md:scroll-mt-28"
      aria-labelledby="story-origin-title"
    >
      <div className="mx-auto max-w-3xl">
        <ScrollReveal>
          <div className="rounded-[1.75rem] border-2 border-[var(--twin-border)] bg-[var(--twin-card)] px-5 py-8 shadow-[0_12px_40px_rgb(25_60_50_/0.1)] sm:px-8 sm:py-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("home.originEyebrow")}
            </p>
            <h2
              id="story-origin-title"
              className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl md:text-[2rem] md:leading-tight"
            >
              {t("home.originTitle")}
            </h2>
            <p className="mt-5 text-base font-medium leading-relaxed text-[var(--foreground)] sm:text-lg">
              {t("home.originLead")}
            </p>
            <div className="mt-8 space-y-5 text-sm font-medium leading-relaxed text-[var(--foreground)] sm:text-base sm:leading-relaxed">
              <p>{t("home.originP1")}</p>
              <p>{t("home.originP2")}</p>
              <p>{t("home.originP3")}</p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
