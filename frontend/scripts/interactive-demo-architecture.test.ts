/**
 * Static guards — interactive /demo scene manifest, cinematic experience, architecture.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_SCENES,
  DEMO_SEQUENCES,
  scenesForSurface,
  validateDemoSceneManifest,
} from "../src/lib/demo/demo-scene-manifest";
import { LAUNCH_STANCE } from "../src/lib/investor-metrics-reality";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 demo page mounts SalesDemoExperience with real video pipeline", () => {
  const page = read("src/app/(marketing)/demo/page.tsx");
  assert.match(page, /SalesDemoExperience/);
  assert.doesNotMatch(page, /FounderLedDemoBelowFold/);
  assert.doesNotMatch(page, /InteractiveDemoWalkthrough/);
});

test("2 manifest defines DemoSurface on every scene", () => {
  for (const scene of DEMO_SCENES) {
    assert.ok(scene.surfaces.length > 0, `${scene.id} missing surfaces`);
  }
  assert.ok(scenesForSurface("full-demo").length >= 8);
  assert.ok(scenesForSurface("homepage-candidate").length >= 5);
});

test("3 four DemoSequence ids registered", () => {
  assert.ok(DEMO_SEQUENCES["candidate-homepage-story"]);
  assert.ok(DEMO_SEQUENCES["full-product-story"]);
  assert.ok(DEMO_SEQUENCES["video-export-homepage"]);
  assert.ok(DEMO_SEQUENCES["video-export-full"]);
});

test("4 cinematic experience reuses scene stage, caption, controls, cursor", () => {
  const experience = read("src/components/marketing/demo/experience/role-story.tsx");
  assert.match(experience, /AnimatedProductSurface/);
  assert.match(experience, /DemoCaption/);
  assert.match(experience, /DemoControls/);
  assert.match(experience, /DemoCursor/);
  const hero = read("src/components/marketing/demo/experience/demo-hero.tsx");
  assert.match(hero, /RoleSelector/);
});

test("5 manifest validation passes", () => {
  assert.deepEqual(validateDemoSceneManifest(), []);
});

test("6 launch stance NO-GO in experience boundary copy", () => {
  assert.equal(LAUNCH_STANCE, "noGo");
  const experience = read("src/components/marketing/demo/experience/outcome-screen.tsx");
  assert.match(experience, /boundaryNote/);
});

test("7 experience autoplays with reduced-motion guard", () => {
  const experience = read("src/components/marketing/demo/experience/demo-experience.tsx");
  assert.match(experience, /prefers-reduced-motion/);
  const roleStory = read("src/components/marketing/demo/experience/role-story.tsx");
  assert.match(roleStory, /autoplayStartedRef/);
});

test("8 modular experience components exported", () => {
  assert.ok(read("src/components/marketing/demo/experience/demo-experience.tsx").includes("DemoExperience"));
  assert.ok(read("src/components/marketing/demo/experience/demo-hero.tsx").includes("DemoHero"));
  assert.ok(read("src/components/marketing/demo/experience/demo-video-story.tsx").includes("DemoVideoStory"));
  assert.ok(read("src/components/marketing/demo/experience/proof-section.tsx").includes("ProofSection"));
  assert.ok(read("src/components/marketing/demo/experience/outcome-screen.tsx").includes("OutcomeScreen"));
  assert.ok(read("src/components/marketing/demo/experience/role-cta.tsx").includes("RoleCta"));
});
