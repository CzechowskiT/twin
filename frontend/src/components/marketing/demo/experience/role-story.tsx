"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { DemoCaption } from "@/components/marketing/demo/demo-caption";
import { DemoChapterNavigation } from "@/components/marketing/demo/demo-chapter-navigation";
import { DemoControls } from "@/components/marketing/demo/demo-controls";
import { DemoCursor } from "@/components/marketing/demo/demo-cursor";
import { AnimatedProductSurface } from "@/components/marketing/demo/experience/animated-product-surface";
import { OutcomeScreen } from "@/components/marketing/demo/experience/outcome-screen";
import { RoleSelector } from "@/components/marketing/demo/experience/role-selector";
import { SceneTimeline } from "@/components/marketing/demo/experience/scene-timeline";
import {
  trackDemoCompleted,
  trackDemoRoleSelected,
  trackDemoSceneViewed,
  trackDemoStarted,
  trackDemoViewed,
} from "@/lib/demo/demo-analytics";
import { journeyScenes } from "@/lib/demo/demo-experience-config";
import { totalDurationMs, type DemoRole, type DemoScene } from "@/lib/demo/demo-scene-manifest";
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

type RoleStoryProps = {
  role: DemoRole;
  onRoleChange: (role: DemoRole) => void;
  autoStart?: boolean;
  scenesOverride?: readonly DemoScene[];
  hideRoleSelector?: boolean;
};

export function RoleStory({
  role,
  onRoleChange,
  autoStart = false,
  scenesOverride,
  hideRoleSelector = false,
}: RoleStoryProps) {
  const { t, locale } = useTranslation();
  const { reducedMotion, checked: motionChecked } = usePrefersReducedMotion();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [takeover, setTakeover] = useState(false);
  const startedRef = useRef(false);
  const viewedRef = useRef(false);
  const autoplayStartedRef = useRef(false);
  const lastSceneRef = useRef<string | null>(null);

  const scenes = useMemo(
    () => scenesOverride ?? journeyScenes(role),
    [role, scenesOverride],
  );
  const activeIndex = useMemo(() => indexForElapsed(scenes, elapsedMs), [elapsedMs, scenes]);
  const scene = scenes[activeIndex] ?? scenes[0];
  const totalMs = totalDurationMs(scenes);
  const completed = elapsedMs >= totalMs && totalMs > 0;

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
    trackDemoViewed({ locale, reduced_motion: reducedMotion, surface: "cinematic" });
  }, [locale, reducedMotion]);

  useEffect(() => {
    if (!motionChecked || !autoStart || reducedMotion || autoplayStartedRef.current) return;
    autoplayStartedRef.current = true;
    startedRef.current = true;
    trackDemoStarted({ role, locale, mode: "cinematic" });
    setPlaying(true);
  }, [motionChecked, autoStart, reducedMotion, role, locale]);

  useEffect(() => {
    if (!playing || takeover || reducedMotion) return;
    const id = window.setInterval(() => {
      setElapsedMs((prev) => {
        const total = totalDurationMs(scenes);
        const next = prev + TICK_MS;
        if (next >= total) {
          setPlaying(false);
          trackDemoCompleted({ role, locale, mode: "cinematic" });
          return total;
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, takeover, reducedMotion, scenes, role, locale]);

  useEffect(() => {
    if (!scene || scene.id === lastSceneRef.current) return;
    lastSceneRef.current = scene.id;
    trackDemoSceneViewed({
      scene_id: scene.analyticsEvent,
      role,
      locale,
      reduced_motion: reducedMotion,
    });
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
      trackDemoStarted({ role, locale, mode: "cinematic" });
    }
    setPlaying((p) => !p);
  };

  const handleRoleChange = (next: DemoRole) => {
    onRoleChange(next);
    setElapsedMs(0);
    setPlaying(false);
    setTakeover(false);
    autoplayStartedRef.current = false;
    trackDemoRoleSelected(next);
  };

  if (!scene) return null;

  return (
    <div className="demo-role-story" data-demo-role-story data-role={role}>
      {!hideRoleSelector ? (
        <RoleSelector activeRole={role} onSelect={handleRoleChange} disabled={playing && !takeover} />
      ) : null}
      <SceneTimeline scenes={scenes} activeIndex={activeIndex} elapsedMs={elapsedMs} onSeek={seekToIndex} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="relative">
            <AnimatedProductSurface
              scene={scene}
              reducedMotion={reducedMotion || takeover}
              progress={sceneProgress}
              compact
            />
            <DemoCursor
              path={scene.cursorPath}
              progress={sceneProgress}
              visible={playing && !reducedMotion && !takeover}
            />
          </div>
          <DemoControls
            playing={playing}
            onPlayPause={handlePlayPause}
            onRestart={() => {
              setElapsedMs(0);
              setPlaying(false);
            }}
            takeover={takeover}
            onTakeoverToggle={() => setTakeover((v) => !v)}
          />
          <DemoCaption
            titleKey={scene.titleKey}
            descriptionKey={scene.descriptionKey}
            highlightKeys={scene.highlightKeys}
            compact
          />
          <OutcomeScreen role={role} visible={completed} />
        </div>
        <aside className="hidden lg:block">
          <DemoChapterNavigation scenes={scenes} activeIndex={activeIndex} onSelect={seekToIndex} />
        </aside>
      </div>

      <p className="text-xs leading-relaxed text-[var(--twin-muted-strong)] sm:text-sm">{t("demoExperience.storyLead")}</p>
    </div>
  );
}
