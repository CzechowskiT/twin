"use client";

import { BentoSpotlight } from "@/components/marketing/bento-spotlight";
import { PipelinePreview } from "@/components/marketing/pipeline-preview";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { useTranslation } from "@/components/language-provider";

function FeatureCard({
  step,
  title,
  body,
  delayMs,
  className = "",
}: {
  step: string;
  title: string;
  body: string;
  delayMs: number;
  className?: string;
}) {
  return (
    <ScrollReveal delayMs={delayMs} className={`h-full ${className}`}>
      <BentoSpotlight className="flex h-full flex-col p-6 sm:p-7">
        <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-zinc-500 transition group-hover/spot:text-zinc-400">
          {step}
        </span>
        <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-white sm:text-xl">{title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">{body}</p>
        <div className="mt-8 h-px w-12 bg-gradient-to-r from-sky-400/90 to-violet-500/70" />
      </BentoSpotlight>
    </ScrollReveal>
  );
}

export function LandingBento() {
  const { t } = useTranslation();
  const features = [
    { step: "01", title: t("home.scrape"), body: t("home.scrapeDesc") },
    { step: "02", title: t("home.match"), body: t("home.matchDesc") },
    { step: "03", title: t("home.track"), body: t("home.trackDesc") },
  ];

  return (
    <section className="border-t border-white/[0.06] bg-gradient-to-b from-black/20 to-transparent py-24 sm:py-28 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ScrollReveal delayMs={40}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">TWIN</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            {t("home.featuresTitle")}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            {t("home.featuresSubtitle")}
          </p>
        </ScrollReveal>

        <div className="mt-14 grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
          <ScrollReveal delayMs={60} className="md:col-span-8 md:row-span-2">
            <BentoSpotlight className="flex h-full min-h-[280px] flex-col p-6 sm:min-h-[320px] sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{t("home.scrape")}</p>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-zinc-400">
                  MVP
                </span>
              </div>
              <div className="mt-8 flex-1">
                <PipelinePreview />
              </div>
              <p className="mt-6 text-xs leading-relaxed text-zinc-500">{t("home.footerHint")}</p>
            </BentoSpotlight>
          </ScrollReveal>

          <FeatureCard {...features[0]} delayMs={100} className="md:col-span-4" />
          <FeatureCard {...features[1]} delayMs={140} className="md:col-span-4" />
          <FeatureCard {...features[2]} delayMs={180} className="md:col-span-12" />
        </div>
      </div>
    </section>
  );
}
