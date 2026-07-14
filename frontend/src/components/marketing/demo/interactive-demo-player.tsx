"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { DemoCaption } from "@/components/marketing/demo/demo-caption";
import { DemoChapterNavigation } from "@/components/marketing/demo/demo-chapter-navigation";
import { DemoControls } from "@/components/marketing/demo/demo-controls";
import { DemoCursor } from "@/components/marketing/demo/demo-cursor";
import { DemoRoleSelector } from "@/components/marketing/demo/demo-role-selector";
import { DemoSceneStage } from "@/components/marketing/demo/demo-scene-stage";
import { DemoTimeline } from "@/components/marketing/demo/demo-timeline";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Shell } from "@/components/ui";
import {
  trackDemoCompleted,
  trackDemoRoleSelected,
  trackDemoScene,
  trackDemoStarted,
  trackDemoViewed,
} from "@/lib/demo/demo-analytics";
import {
  DEMO_SCENES,
  scenesForRole,
  totalDurationMs,
  type DemoRole,
} from "@/lib/demo/demo-scene-manifest";
import { indexForElapsed } from "@/lib/demo/demo-playback";

const TICK_MS = 200;

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

function focusDemoControls(): void {
  const section = document.getElementById("interactive-story");
  section?.scrollIntoView({ behavior: "auto", block: "nearest" });
  section?.focus({ preventScroll: true });
  section?.querySelector<HTMLButtonElement>("[data-demo-controls] button")?.focus({ preventScroll: true });
}

function InteractiveDemoPlayerBody() {
  const { t, locale } = useTranslation();
  const { reducedMotion, checked: motionChecked } = usePrefersReducedMotion();
  const [role, setRole] = useState<DemoRole>("overview");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [takeover, setTakeover] = useState(false);
  const startedRef = useRef(false);
  const viewedRef = useRef(false);
  const autoplayStartedRef = useRef(false);

  const scenes = useMemo(() => scenesForRole(role), [role]);
  const activeIndex = useMemo(() => indexForElapsed(scenes, elapsedMs), [elapsedMs, scenes]);
  const scene = scenes[activeIndex] ?? scenes[0];
  const sceneElapsed = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < activeIndex; i++) offset += scenes[i]?.durationMs ?? 0;
    return Math.max(0, elapsedMs - offset);
  }, [activeIndex, elapsedMs, scenes]);
  const sceneProgress =
    scene && scene.durationMs > 0 ? Math.min(1, sceneElapsed / scene.durationMs) : 0;

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackDemoViewed({ locale, reduced_motion: reducedMotion });
  }, [locale, reducedMotion]);

  useEffect(() => {
    if (!motionChecked || reducedMotion || autoplayStartedRef.current) return;
    autoplayStartedRef.current = true;
    startedRef.current = true;
    trackDemoStarted({ role, locale, mode: "full" });
    setPlaying(true);
  }, [motionChecked, reducedMotion, role, locale]);

  useEffect(() => {
    if (!playing || takeover || reducedMotion) return;
    const id = window.setInterval(() => {
      setElapsedMs((prev) => {
        const total = totalDurationMs(scenes);
        const next = prev + TICK_MS;
        if (next >= total) {
          setPlaying(false);
          trackDemoCompleted({ role, locale, mode: role === "overview" ? "full" : "chapter" });
          return total;
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, takeover, reducedMotion, scenes, role, locale]);

  useEffect(() => {
    if (!scene) return;
    trackDemoScene({ scene_id: scene.analyticsEvent, role, locale, reduced_motion: reducedMotion });
  }, [scene?.id, role, locale, reducedMotion, scene]);

  const seekToIndex = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < index; i++) offset += scenes[i]?.durationMs ?? 0;
      setElapsedMs(offset);
      setTakeover(true);
      setPlaying(false);
    },
    [scenes],
  );

  const handlePlayPause = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackDemoStarted({ role, locale, mode: role === "overview" ? "full" : "chapter" });
    }
    setPlaying((p) => !p);
  };

  const handleRoleChange = (next: DemoRole) => {
    setRole(next);
    setElapsedMs(0);
    setPlaying(false);
    setTakeover(false);
    trackDemoRoleSelected(next);
  };

  if (!scene) return null;

  return (
    <>
      <DemoRoleSelector activeRole={role} onSelect={handleRoleChange} disabled={playing && !takeover} />
      <DemoTimeline scenes={scenes} activeIndex={activeIndex} elapsedMs={elapsedMs} onSeek={seekToIndex} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="relative">
            <DemoSceneStage scene={scene} reducedMotion={reducedMotion || takeover} compact />
            <DemoCursor path={scene.cursorPath} progress={sceneProgress} visible={playing && !reducedMotion && !takeover} />
          </div>
          <DemoControls
            playing={playing}
            onPlayPause={handlePlayPause}
            onRestart={() => {
              setElapsedMs(0);
              setPlaying(false);
            }}
            takeover={takeover}
            onTakeoverToggle={() => setTakeover((t) => !t)}
          />
          <DemoCaption
            titleKey={scene.titleKey}
            descriptionKey={scene.descriptionKey}
            highlightKeys={scene.highlightKeys}
            compact
          />
        </div>
        <aside className="hidden lg:block">
          <DemoChapterNavigation scenes={scenes} activeIndex={activeIndex} onSelect={seekToIndex} />
        </aside>
      </div>

      <p className="text-xs leading-relaxed text-[var(--twin-muted-strong)] sm:text-sm">{t("interactiveDemoPlayer.lead")}</p>
      <p className="text-xs text-[var(--twin-muted)]">{t("interactiveDemoPlayer.boundaryNote")}</p>
    </>
  );
}

/** Compact hero + interactive player in one above-fold shell. */
export function DemoAboveFoldSection() {
  const { t } = useTranslation();
  const onLaunchDemo = useCallback(() => focusDemoControls(), []);

  return (
    <Shell wide>
      <MarketingPageSurface wide withCard={false}>
        <div className="marketing-copy-rail min-w-0 space-y-4 sm:space-y-5">
          <header
            className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--twin-border)]/60 pb-4"
            data-founder-led-demo="hero"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
                {t("founderLedDemo.pageEyebrow")}
              </p>
              <h1 className="twin-section-title text-lg sm:text-2xl md:text-3xl">{t("founderLedDemo.pageTitle")}</h1>
            </div>
            <button
              type="button"
              data-founder-led-demo-cta="launch"
              className="twin-btn-primary twin-touch-target shrink-0"
              onClick={onLaunchDemo}
            >
              {t("founderLedDemo.heroCtaLaunch")}
            </button>
          </header>

          <section
            className="scroll-mt-20 space-y-3 sm:space-y-4"
            data-interactive-demo-player
            id="interactive-story"
            tabIndex={-1}
            aria-label={t("interactiveDemoPlayer.title")}
          >
            <p className="sr-only sm:not-sr-only text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("interactiveDemoPlayer.eyebrow")}
            </p>
            <InteractiveDemoPlayerBody />
          </section>
        </div>
      </MarketingPageSurface>
    </Shell>
  );
}

export function InteractiveDemoPlayer() {
  return <DemoAboveFoldSection />;
}

export function InteractiveDemoSystemMap() {
  const { t } = useTranslation();
  return (
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <section className="marketing-copy-rail space-y-4" id="system-map" data-demo-system-map>
          <h2 className="text-xl font-semibold text-[var(--twin-fg)]">{t("interactiveDemoPlayer.systemMapTitle")}</h2>
          <p className="text-sm text-[var(--twin-muted-strong)]">{t("interactiveDemoPlayer.systemMapLead")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["candidate", "recruiter", "company"] as const).map((persona) => (
              <div
                key={persona}
                className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-elevated)] p-4"
              >
                <h3 className="font-semibold text-[var(--twin-fg)]">
                  {t(`interactiveDemoPlayer.systemMap_${persona}Title`)}
                </h3>
                <p className="mt-2 text-sm text-[var(--twin-muted-strong)]">
                  {t(`interactiveDemoPlayer.systemMap_${persona}Body`)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </MarketingPageSurface>
    </Shell>
  );
}

export const DEMO_SCENE_COUNT = DEMO_SCENES.length;
