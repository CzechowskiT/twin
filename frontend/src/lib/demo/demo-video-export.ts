/**
 * Single video render pipeline config — homepage + full-product variants.
 */

import { sequenceDurationMs, type DemoSequenceId } from "@/lib/demo/demo-scene-manifest";

export type DemoVideoExportTarget = "homepage" | "full";

export const DEMO_VIDEO_EXPORT_SEQUENCES: Record<DemoVideoExportTarget, DemoSequenceId> = {
  homepage: "video-export-homepage",
  full: "video-export-full",
};

export type DemoVideoRenderConfig = {
  target: DemoVideoExportTarget;
  sequenceId: DemoSequenceId;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  outputBasename: string;
};

export function buildVideoRenderConfig(target: DemoVideoExportTarget): DemoVideoRenderConfig {
  const sequenceId = DEMO_VIDEO_EXPORT_SEQUENCES[target];
  return {
    target,
    sequenceId,
    width: target === "homepage" ? 1280 : 1440,
    height: target === "homepage" ? 720 : 900,
    fps: 30,
    durationMs: sequenceDurationMs(sequenceId),
    outputBasename: `twin-demo-${target}`,
  };
}

export function videoExportManifest() {
  return (["homepage", "full"] as const).map((target) => buildVideoRenderConfig(target));
}
