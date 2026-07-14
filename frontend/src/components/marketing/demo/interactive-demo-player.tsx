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

export function InteractiveDemoPlayer() {
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
    <Shell wide rail>
      <MarketingPageSurface wide withCard={false}>
        <section
          className="marketing-copy-rail scroll-mt-20 space-y-5 sm:space-y-6"
          data-interactive-demo-player
          id="interactive-story"
          tabIndex={-1}
        >
          <header className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
              {t("interactiveDemoPlayer.eyebrow")}
            </p>
            <h2 className="twin-section-title text-2xl sm:text-3xl lg:text-4xl">{t("interactiveDemoPlayer.title")}</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-[var(--twin-muted-strong)] sm:text-base">
              {t("interactiveDemoPlayer.lead")}
            </p>
          </header>

          <DemoRoleSelector activeRole={role} onSelect={handleRoleChange} disabled={playing && !takeover} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-4">
              <div className="relative">
                <DemoSceneStage scene={scene} reducedMotion={reducedMotion || takeover} />
                <DemoCursor path={scene.cursorPath} progress={sceneProgress} visible={playing && !reducedMotion && !takeover} />
              </div>
              <DemoCaption
                titleKey={scene.titleKey}
                descriptionKey={scene.descriptionKey}
                highlightKeys={scene.highlightKeys}
              />
              <DemoTimeline scenes={scenes} activeIndex={activeIndex} elapsedMs={elapsedMs} onSeek={seekToIndex} />
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
            </div>
            <aside className="hidden lg:block">
              <DemoChapterNavigation scenes={scenes} activeIndex={activeIndex} onSelect={seekToIndex} />
            </aside>
          </div>

          <p className="text-xs text-[var(--twin-muted)]">{t("interactiveDemoPlayer.boundaryNote")}</p>
        </section>
      </MarketingPageSurface>
    </Shell>
  );
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
