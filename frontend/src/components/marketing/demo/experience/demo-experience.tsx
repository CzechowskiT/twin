"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { DemoHero } from "@/components/marketing/demo/experience/demo-hero";
import { DemoVideoStory } from "@/components/marketing/demo/experience/demo-video-story";
import { ProofSection } from "@/components/marketing/demo/experience/proof-section";
import { RoleStory } from "@/components/marketing/demo/experience/role-story";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";
import type { DemoRole } from "@/lib/demo/demo-scene-manifest";

function usePrefersReducedMotion(): { reducedMotion: boolean; checked: boolean } {
  const [state, setState] = useState({ reducedMotion: false, checked: false });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setState({ reducedMotion: mq.matches, checked: true });
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return state;
}

export function DemoExperience() {
  const { t } = useTranslation();
  const { reducedMotion, checked: motionChecked } = usePrefersReducedMotion();
  const [role, setRole] = useState<DemoRole>("overview");
  const [filmDone, setFilmDone] = useState(false);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const storyRef = useRef<HTMLElement | null>(null);

  const scrollToStory = useCallback(() => {
    storyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    storyRef.current?.focus({ preventScroll: true });
    storyRef.current?.querySelector<HTMLButtonElement>("[data-demo-controls] button")?.focus({ preventScroll: true });
  }, []);

  const handleStartJourney = useCallback(() => {
    setJourneyStarted(true);
    setFilmDone(true);
    requestAnimationFrame(scrollToStory);
  }, [scrollToStory]);

  const handleFilmComplete = useCallback(() => {
    setFilmDone(true);
    if (journeyStarted) scrollToStory();
  }, [journeyStarted, scrollToStory]);

  useEffect(() => {
    if (motionChecked && reducedMotion) setFilmDone(true);
  }, [motionChecked, reducedMotion]);

  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
        <div className="demo-experience marketing-copy-rail min-w-0 space-y-6 sm:space-y-8" data-demo-experience>
          <DemoHero activeRole={role} onRoleSelect={setRole} onStartJourney={handleStartJourney} />

          {motionChecked && !filmDone && !reducedMotion ? (
            <DemoVideoStory
              onComplete={handleFilmComplete}
              onSkip={handleStartJourney}
              reducedMotion={reducedMotion}
            />
          ) : null}

          <section
            ref={storyRef}
            className="demo-experience__story scroll-mt-20 space-y-3 sm:space-y-4"
            data-interactive-demo-player
            id="interactive-story"
            tabIndex={-1}
            aria-label={t("demoExperience.storyAria")}
          >
            <p className="sr-only sm:not-sr-only text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("demoExperience.storyEyebrow")}
            </p>
            <RoleStory role={role} onRoleChange={setRole} autoStart={journeyStarted || filmDone} />
          </section>

          <ProofSection />
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}
