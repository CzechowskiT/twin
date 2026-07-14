/**
 * Static guards — interactive /demo scene manifest, player, and architecture.
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

test("1 demo page mounts InteractiveDemoPlayer and walkthrough", () => {
  const page = read("src/app/(marketing)/demo/page.tsx");
  assert.match(page, /InteractiveDemoPlayer/);
  assert.match(page, /InteractiveDemoWalkthrough/);
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

test("4 player reuses DemoSceneStage DemoCaption DemoControls DemoCursor", () => {
  const player = read("src/components/marketing/demo/interactive-demo-player.tsx");
  assert.match(player, /DemoSceneStage/);
  assert.match(player, /DemoCaption/);
  assert.match(player, /DemoControls/);
  assert.match(player, /DemoCursor/);
});

test("5 manifest validation passes", () => {
  assert.deepEqual(validateDemoSceneManifest(), []);
});

test("6 launch stance NO-GO in player boundary copy", () => {
  assert.equal(LAUNCH_STANCE, "noGo");
  const player = read("src/components/marketing/demo/interactive-demo-player.tsx");
  assert.match(player, /boundaryNote/);
});

test("7 walkthrough still eight steps with simulation label", () => {
  const walkthrough = read("src/components/marketing/interactive-demo-walkthrough.tsx");
  assert.match(walkthrough, /STEP_COUNT = 8/);
  assert.match(walkthrough, /interactiveDemo\.simulationLabel/);
});
