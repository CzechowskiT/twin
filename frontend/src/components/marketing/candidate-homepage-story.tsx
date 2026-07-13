"use client";

import Link from "next/link";

import { CandidateHomepageStoryPlayer } from "@/components/marketing/demo/candidate-homepage-story-player";
import { useTranslation } from "@/components/language-provider";

type CandidateHomepageStoryProps = {
  inViewport?: boolean;
};

export function CandidateHomepageStory({ inViewport = true }: CandidateHomepageStoryProps) {
  const { t } = useTranslation();

  return (
    <section
      className="candidate-homepage-story marketing-section-demo-feed demo-glass-panel p-5 sm:p-6"
      aria-labelledby="homepage-candidate-story-heading"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
        {t("homepageCandidateStory.eyebrow")}
      </p>
      <h2 id="homepage-candidate-story-heading" className="twin-section-title mt-2 text-xl sm:text-2xl">
        {t("homepageCandidateStory.title")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
        {t("homepageCandidateStory.lead")}
      </p>

      <div className="mt-5">
        <CandidateHomepageStoryPlayer inViewport={inViewport} />
      </div>

      <p className="mt-3 text-xs text-[var(--twin-muted)]">
        <Link href="/for-candidates" className="font-semibold text-[var(--twin-accent)] hover:underline">
          {t("nav.forCandidates")} →
        </Link>
      </p>
    </section>
  );
}
