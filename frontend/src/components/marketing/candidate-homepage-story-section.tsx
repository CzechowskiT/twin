"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { trackHomepageCandidateStory } from "@/lib/demo/demo-analytics";

const CandidateHomepageStory = dynamic(
  () =>
    import("@/components/marketing/candidate-homepage-story").then((m) => m.CandidateHomepageStory),
  { ssr: false, loading: () => null },
);

/** SSR poster shell — static first frame, hydrates on intersection. */
export function CandidateHomepageStorySection() {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);
  const [hydrate, setHydrate] = useState(false);
  const [inViewport, setInViewport] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHydrate(true);
          setInViewport(true);
          if (!viewedRef.current) {
            viewedRef.current = true;
            trackHomepageCandidateStory("homepage_candidate_story_view");
          }
        } else {
          setInViewport(false);
        }
      },
      { rootMargin: "120px", threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (hydrate) {
    return (
      <div
        ref={rootRef as React.RefObject<HTMLDivElement>}
        className="candidate-homepage-story-section mx-auto max-w-6xl px-4 sm:px-6"
        data-testid="homepage-candidate-story-section"
      >
        <CandidateHomepageStory inViewport={inViewport} />
      </div>
    );
  }

  return (
    <section
      ref={rootRef}
      className="candidate-homepage-story-section mx-auto max-w-6xl px-4 sm:px-6"
      data-testid="homepage-candidate-story-section"
      aria-labelledby="homepage-candidate-story-poster-heading"
    >
      <div className="demo-glass-panel candidate-homepage-story-poster p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("homepageCandidateStory.eyebrow")}
        </p>
        <h2 id="homepage-candidate-story-poster-heading" className="twin-section-title mt-2 text-xl sm:text-2xl">
          {t("homepageCandidateStory.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--twin-muted-strong)]">
          {t("homepageCandidateStory.lead")}
        </p>
        <div
          className="mt-5 flex min-h-[12rem] items-center justify-center rounded-2xl border border-dashed border-[var(--twin-border)]/60 bg-[var(--twin-surface-raised)]/30 px-4 py-8 text-center text-sm text-[var(--twin-muted)]"
          role="img"
          aria-label={t("homepageCandidateStory.posterAria")}
        >
          {t("homepageCandidateStory.posterHint")}
        </div>
      </div>
    </section>
  );
}
