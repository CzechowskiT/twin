"use client";

import { DemoSceneStage } from "@/components/marketing/demo/demo-scene-stage";
import type { DemoScene } from "@/lib/demo/demo-scene-manifest";

type AnimatedProductSurfaceProps = {
  scene: DemoScene;
  reducedMotion: boolean;
  progress: number;
  compact?: boolean;
};

/** Wraps scene stage with subtle motion tied to playback progress. */
export function AnimatedProductSurface({ scene, reducedMotion, progress, compact }: AnimatedProductSurfaceProps) {
  const motionClass = reducedMotion ? "" : "demo-animated-surface";
  const scale = reducedMotion ? 1 : 1 + progress * 0.01;

  return (
    <div
      className={motionClass}
      data-demo-animated-surface
      style={reducedMotion ? undefined : { transform: `scale(${scale})` }}
    >
      <DemoSceneStage scene={scene} reducedMotion={reducedMotion} compact={compact} />
    </div>
  );
}
