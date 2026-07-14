/**
 * Static guard for /demo cinematic experience — autoplay, simulation copy, motion safety.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const FORBIDDEN_IN_DEMO = [
  /\bAuto apply\b/i,
  /\bApply now\b/i,
  /\bGuaranteed interview\b/i,
  /\bKYC verified\b/i,
  /\bLIVE\b.*calendar/i,
  /\bTWIN applies autonomously\b/i,
];

const demoPage = read("src/app/(marketing)/demo/page.tsx");
const player = read("src/components/marketing/demo/interactive-demo-player.tsx");
const experience = read("src/components/marketing/demo/experience/demo-experience.tsx");
const roleStory = read("src/components/marketing/demo/experience/role-story.tsx");
const i18n = read("src/lib/i18n.ts");
const globals = read("src/app/globals.css");

test("demo page mounts DemoExperience above journey catalog", () => {
  assert.match(demoPage, /DemoExperience/);
  assert.match(demoPage, /FounderLedDemoBelowFold/);
  assert.doesNotMatch(demoPage, /InteractiveDemoWalkthrough/);
  assert.doesNotMatch(demoPage, /DemoProductWalkthrough/);
  const playerIdx = demoPage.indexOf("DemoExperience");
  const journeyIdx = demoPage.indexOf("FounderLedDemoBelowFold");
  assert.ok(playerIdx >= 0 && journeyIdx >= 0 && playerIdx < journeyIdx);
});

test("player autoplays on load with reduced-motion guard", () => {
  assert.match(roleStory, /autoplayStartedRef/);
  assert.match(experience, /prefers-reduced-motion/);
  assert.match(roleStory, /setPlaying\(true\)/);
  assert.match(player, /DemoExperience/);
});

test("player exposes play/pause, restart, takeover, role tabs, timeline", () => {
  assert.match(roleStory, /DemoControls/);
  assert.match(roleStory, /RoleSelector/);
  assert.match(roleStory, /SceneTimeline/);
  assert.match(roleStory, /DemoChapterNavigation/);
});

test("player uses synthetic fixtures and boundary note", () => {
  assert.match(roleStory, /demo-scene-manifest/);
  assert.match(roleStory, /demoExperience\.storyLead/);
  const outcome = read("src/components/marketing/demo/experience/outcome-screen.tsx");
  assert.match(outcome, /boundaryNote/);
  assert.match(i18n, /SIMULATION · SAMPLE DATA ONLY/);
  assert.match(i18n, /SYMULACJA · TYLKO PRÓBKA/);
});

test("player respects prefers-reduced-motion CSS", () => {
  assert.match(globals, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(globals, /\.demo-cinematic-hero/);
});

test("demo copy avoids forbidden live-apply claims", () => {
  const start = i18n.indexOf("demoExperience:");
  const end = i18n.indexOf("homepageCandidateStory:", start);
  const demoI18n = i18n.slice(start, end > start ? end : undefined);
  for (const pattern of FORBIDDEN_IN_DEMO) {
    assert(!pattern.test(experience), `Forbidden in experience: ${pattern}`);
    assert(!pattern.test(demoI18n), `Forbidden in i18n demoExperience: ${pattern}`);
  }
});

test("hero CTA keys exist in EN and PL", () => {
  assert.match(i18n, /heroCta: "Watch the story"/);
  assert.match(i18n, /heroCta: "Zobacz historię"/);
});
