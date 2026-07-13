#!/usr/bin/env npx tsx
/**
 * Demo video render manifest CLI — `npm run demo:render:video [-- homepage|full]`
 * Emits JSON config for external capture pipeline (Playwright/ffmpeg).
 */
import { buildVideoRenderConfig, videoExportManifest } from "../src/lib/demo/demo-video-export";
import { validateDemoSceneManifest } from "../src/lib/demo/demo-scene-manifest";

const target = (process.argv[2] as "homepage" | "full" | undefined) ?? "all";

const issues = validateDemoSceneManifest();
if (issues.length > 0) {
  console.error("Manifest validation failed:", issues.join("; "));
  process.exit(1);
}

if (target === "all") {
  console.log(JSON.stringify(videoExportManifest(), null, 2));
} else if (target === "homepage" || target === "full") {
  console.log(JSON.stringify(buildVideoRenderConfig(target), null, 2));
} else {
  console.error("Usage: demo:render:video [homepage|full|all]");
  process.exit(1);
}
