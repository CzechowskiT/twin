"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { DemoCaption } from "@/components/marketing/demo/demo-caption";
import { DemoCursor } from "@/components/marketing/demo/demo-cursor";
import { DemoSceneStage } from "@/components/marketing/demo/demo-scene-stage";
import { DemoTimeline } from "@/components/marketing/demo/demo-timeline";
import { DemoSampleBadge } from "@/components/marketing/demo-sample-badge";
import { trackHomepageCandidateStory } from "@/lib/demo/demo-analytics";
import { resolveSequenceScenes, totalDurationMs } from "@/lib/demo/demo-scene-manifest";
import { LAUNCH_STANCE } from "@/lib/investor-metrics-reality";

const TICK_MS = 200;
const SEQUENCE_ID = "candidate-homepage-story" as const;

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduce;
}

type CandidateHomepageStoryPlayerProps = {
  inViewport?: boolean;
};

export function CandidateHomepageStoryPlayer({ inViewport = true }: CandidateHomepageStoryPlayerProps) {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const scenes = useMemo(() => resolveSequenceScenes(SEQUENCE_ID), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [readMode, setReadMode] = useState(false);
  const scene = scenes[activeIndex] ?? scenes[0];

  const sceneElapsed = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < activeIndex; i++) offset += scenes[i]?.durationMs ?? 0;
    return Math.max(0, elapsedMs - offset);
  }, [activeIndex, elapsedMs, scenes]);

  const sceneProgress =
    scene && scene.durationMs > 0 ? Math.min(1, sceneElapsed / scene.durationMs) : 0;

  useEffect(() => {
    if (reducedMotion || readMode) {
      setPlaying(false);
      return;
    }
    if (inViewport) {
      setPlaying(true);
      trackHomepageCandidateStory("homepage_candidate_story_autoplay_start", { step: activeIndex });
    } else {
      setPlaying(false);
      trackHomepageCandidateStory("homepage_candidate_story_autoplay_pause", { step: activeIndex });
    }
  }, [inViewport, reducedMotion, readMode, activeIndex]);

  useEffect(() => {
    if (!playing || reducedMotion || readMode) return;
    const id = window.setInterval(() => {
      setElapsedMs((prev) => {
        const total = totalDurationMs(scenes);
        const next = prev + TICK_MS;
        if (next >= total) {
          setPlaying(false);
          return total;
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, reducedMotion, readMode, scenes]);

  useEffect(() => {
    let offset = 0;
    for (let i = 0; i < scenes.length; i++) {
      offset += scenes[i]?.durationMs ?? 0;
      if (elapsedMs < offset) {
        if (i !== activeIndex) {
          setActiveIndex(i);
          trackHomepageCandidateStory("homepage_candidate_story_scene_change", { step: i });
        }
        break;
      }
    }
  }, [elapsedMs, scenes, activeIndex]);

  const seekToIndex = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < index; i++) offset += scenes[i]?.durationMs ?? 0;
      setActiveIndex(index);
      setElapsedMs(offset);
      setPlaying(false);
      trackHomepageCandidateStory("homepage_candidate_story_scene_change", { step: index });
    },
    [scenes],
  );

  const skipAnimation = () => {
    seekToIndex(scenes.length - 1);
    trackHomepageCandidateStory("homepage_candidate_story_skip_animation", { step: activeIndex });
  };

  const enterReadMode = () => {
    setReadMode(true);
    setPlaying(false);
    trackHomepageCandidateStory("homepage_candidate_story_read_story", { step: activeIndex });
  };

  if (!scene) return null;

  return (
    <div
      className="candidate-homepage-story-player space-y-4"
      data-testid="homepage-candidate-story"
      data-demo-sequence={SEQUENCE_ID}
      data-launch-stance={LAUNCH_STANCE}
    >
      <div className="flex flex-wrap items-center gap-2">
        <DemoSampleBadge />
        <p className="interactive-demo-simulation-pill text-[10px]" role="status">
          {t("interactiveDemo.simulationLabel")}
        </p>
      </div>

      <div className="relative">
        <DemoSceneStage
          scene={scene}
          reducedMotion={reducedMotion || readMode}
          onCtaDemo={() => trackHomepageCandidateStory("homepage_candidate_story_cta_demo")}
          onCtaPilot={() => trackHomepageCandidateStory("homepage_candidate_story_cta_pilot")}
        />
        <DemoCursor path={scene.cursorPath} progress={sceneProgress} visible={playing && !reducedMotion && !readMode} />
      </div>

      <DemoCaption
        titleKey={scene.titleKey}
        descriptionKey={scene.descriptionKey}
        highlightKeys={scene.highlightKeys}
      />

      <DemoTimeline scenes={scenes} activeIndex={activeIndex} elapsedMs={elapsedMs} onSeek={seekToIndex} />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="twin-btn-secondary twin-touch-target text-xs" onClick={skipAnimation}>
          {t("homepageCandidateStory.skipAnimation")}
        </button>
        <button type="button" className="twin-btn-secondary twin-touch-target text-xs" onClick={enterReadMode}>
          {t("homepageCandidateStory.readStory")}
        </button>
      </div>
    </div>
  );
}
