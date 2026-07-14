"use client";

import { DemoTimeline } from "@/components/marketing/demo/demo-timeline";
import type { DemoScene } from "@/lib/demo/demo-scene-manifest";

type SceneTimelineProps = {
  scenes: readonly DemoScene[];
  activeIndex: number;
  elapsedMs: number;
  onSeek: (index: number) => void;
};

/** Cinematic experience timeline — reuses shared progress bar + scene chips. */
export function SceneTimeline(props: SceneTimelineProps) {
  return <DemoTimeline {...props} />;
}
