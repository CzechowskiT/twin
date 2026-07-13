/**
 * Static guards — homepage candidate story sequence, manifest inventory, launch stance.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_SEQUENCES,
  resolveSequenceScenes,
  sequenceDurationMs,
  validateDemoSceneManifest,
} from "../src/lib/demo/demo-scene-manifest";
import { videoExportManifest } from "../src/lib/demo/demo-video-export";
import { LAUNCH_STANCE } from "../src/lib/investor-metrics-reality";
import { en, pl } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const FORBIDDEN_HOMEPAGE_STORY = [
  /\bAuto apply\b/i,
  /\bApply now\b/i,
  /\bGuaranteed interview\b/i,
  /\bTWIN applies autonomously\b/i,
  /\bSign up\b/i,
  /\bRegister now\b/i,
];

test("1 launch stance remains NO-GO", () => {
  assert.equal(LAUNCH_STANCE, "noGo");
});

test("2 manifest validates — surfaces, sequences, duration bands", () => {
  const issues = validateDemoSceneManifest();
  assert.deepEqual(issues, [], issues.join("; "));
});

test("3 candidate-homepage-story has 5–7 scenes and 35–60s duration", () => {
  const scenes = resolveSequenceScenes("candidate-homepage-story");
  assert.ok(scenes.length >= 5 && scenes.length <= 7);
  const sec = sequenceDurationMs("candidate-homepage-story") / 1000;
  const band = DEMO_SEQUENCES["candidate-homepage-story"].targetDurationSec;
  assert.ok(sec >= band.min && sec <= band.max, `duration ${sec}s outside band`);
});

test("4 homepage story section uses lazy hydration and intersection observer", () => {
  const section = read("src/components/marketing/candidate-homepage-story-section.tsx");
  assert.match(section, /dynamic\(/);
  assert.match(section, /IntersectionObserver/);
  assert.match(section, /ssr:\s*false/);
  assert.match(section, /candidate-homepage-story-poster/);
});

test("5 homepage story player reuses shared demo components", () => {
  const player = read("src/components/marketing/demo/candidate-homepage-story-player.tsx");
  assert.match(player, /DemoSceneStage/);
  assert.match(player, /DemoCaption/);
  assert.match(player, /DemoTimeline/);
  assert.match(player, /DemoCursor/);
  assert.match(player, /data-launch-stance/);
});

test("6 homepage mounted below hero on marketing page", () => {
  const page = read("src/app/(marketing)/page.tsx");
  const heroIdx = page.indexOf("LandingHero");
  const storyIdx = page.indexOf("CandidateHomepageStorySection");
  assert.ok(heroIdx >= 0 && storyIdx > heroIdx);
});

test("7 analytics events homepage_candidate_story_*", () => {
  const analytics = read("src/lib/demo/demo-analytics.ts");
  assert.match(analytics, /homepage_candidate_story_view/);
  assert.match(analytics, /homepage_candidate_story_autoplay_start/);
  assert.match(analytics, /homepage_candidate_story_cta_demo/);
});

test("8 homepage copy avoids forbidden auto-apply and signup claims", () => {
  const story = read("src/components/marketing/candidate-homepage-story.tsx");
  const i18nFull = read("src/lib/i18n.ts");
  const i18nBlock = i18nFull.slice(i18nFull.indexOf("homepageCandidateStory:"), i18nFull.indexOf("founderLedDemo:"));
  for (const pattern of FORBIDDEN_HOMEPAGE_STORY) {
    assert(!pattern.test(story), `Forbidden in story component: ${pattern}`);
    assert(!pattern.test(i18nBlock), `Forbidden in i18n homepageCandidateStory: ${pattern}`);
  }
});

test("9 video export pipeline covers homepage and full variants", () => {
  const manifest = videoExportManifest();
  assert.equal(manifest.length, 2);
  assert.ok(manifest.every((m) => m.durationMs > 0));
});

test("10 homepageCandidateStory keys exist in EN and PL", () => {
  const keys = Object.keys(en.homepageCandidateStory) as (keyof typeof en.homepageCandidateStory)[];
  for (const key of keys) {
    assert.ok(en.homepageCandidateStory[key], `en missing ${key}`);
    assert.ok(pl.homepageCandidateStory[key], `pl missing ${key}`);
  }
});
