/**
 * Interactive /demo cinematic rebuild — component, i18n, launch stance, and route guards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { FOUNDER_LED_DEMO_JOURNEY_STEPS } from "../src/lib/founder-led-demo-routes";
import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_DEMO_COPY = [
  /\bauto-apply is live\b/i,
  /\bStripe LIVE\b/i,
  /\bapplies automatically\b/i,
  /\bwe message candidates automatically\b/i,
];

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 demo page wires cinematic experience stack", () => {
  const page = read("src/app/(marketing)/demo/page.tsx");
  assert.match(page, /DemoExperience/);
  assert.match(page, /DemoSurfaceCatalog/);
  assert.match(page, /InteractiveDemoSystemMap/);
  assert.match(page, /DemoPilotCta/);
});

test("2 manifest module is single source", () => {
  assert.ok(existsSync(join(root, "src/lib/demo/demo-scene-manifest.ts")));
  const roleStory = read("src/components/marketing/demo/experience/role-story.tsx");
  assert.match(roleStory, /demo-scene-manifest/);
});

test("3 analytics wrapper avoids PII props", () => {
  const analytics = read("src/lib/demo/demo-analytics.ts");
  assert.match(analytics, /trackEvent/);
  assert.match(analytics, /demo_cta_clicked/);
  assert.match(analytics, /demo_scene_viewed/);
  assert.doesNotMatch(analytics, /email/);
});

test("4 reduced motion hook and autoplay guard present in experience", () => {
  const experience = read("src/components/marketing/demo/experience/demo-experience.tsx");
  assert.match(experience, /prefers-reduced-motion/);
  const roleStory = read("src/components/marketing/demo/experience/role-story.tsx");
  assert.match(roleStory, /autoplayStartedRef/);
});

test("5 catalog collapsed toggle uses explore-all copy", () => {
  assert.ok(FOUNDER_LED_DEMO_JOURNEY_STEPS.length >= 30);
  const catalog = read("src/components/marketing/demo/demo-surface-catalog.tsx");
  assert.match(catalog, /FOUNDER_LED_DEMO_JOURNEY_STEPS/);
  assert.match(catalog, /catalogToggle/);
  assert.match(en.interactiveDemoPlayer.catalogToggle, /Explore all product surfaces/);
  assert.match(dictionaries.pl.interactiveDemoPlayer.catalogToggle, /Zobacz wszystkie moduły produktu/);
});

test("6 i18n demoExperience keys mirrored EN/PL", () => {
  const enKeys = Object.keys(en.demoExperience);
  const plKeys = Object.keys(dictionaries.pl.demoExperience);
  assert.deepEqual(plKeys.sort(), enKeys.sort());
});

test("7 launch stance — demo copy has no hard-banned CTAs", () => {
  const blob = [
    read("src/components/marketing/demo/experience/demo-experience.tsx"),
    read("src/components/marketing/demo/experience/outcome-screen.tsx"),
    read("src/components/marketing/demo/demo-pilot-cta.tsx"),
    JSON.stringify(en.demoExperience),
    JSON.stringify(dictionaries.pl.demoExperience),
  ].join("\n");
  for (const pattern of FORBIDDEN_DEMO_COPY) {
    assert.doesNotMatch(blob, pattern, String(pattern));
  }
});

test("8 bundle imports stay marketing-local", () => {
  const experience = read("src/components/marketing/demo/experience/demo-experience.tsx");
  assert.doesNotMatch(experience, /from "@\/app\/api/);
  assert.doesNotMatch(experience, /fetch\(/);
});

test("9 keyboard controls exposed on timeline", () => {
  const timeline = read("src/components/marketing/demo/demo-timeline.tsx");
  assert.match(timeline, /role="progressbar"/);
  const controls = read("src/components/marketing/demo/demo-controls.tsx");
  assert.match(controls, /type="button"/);
});

test("10 demo fixtures use synthetic IDs only", () => {
  const fixtures = read("src/lib/demo/demo-fixtures.ts");
  assert.match(fixtures, /demo-candidate-001/);
  assert.doesNotMatch(fixtures, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
});

test("11 full-demo scenes render rich product surfaces not text-only", () => {
  const stage = read("src/components/marketing/demo/demo-scene-stage.tsx");
  const surfaces = read("src/components/marketing/demo/demo-scene-surfaces.tsx");
  assert.match(stage, /demo-scene-surfaces/);
  assert.match(surfaces, /DemoIntroSurface/);
  assert.match(surfaces, /DemoNorthStarSurface/);
  assert.match(surfaces, /DemoCandidatePipelineSurface/);
  assert.match(surfaces, /DemoRecruiterInboxSurface/);
  assert.match(surfaces, /DemoCompanyMemorySurface/);
  assert.match(surfaces, /DemoCalendarHoldSurface/);
  assert.match(surfaces, /DemoTrustBoundarySurface/);
  assert.match(surfaces, /DemoPilotCtaSurface/);
  assert.doesNotMatch(stage, /scene\.descriptionKey\).*north_star/);
  const animated = read("src/components/marketing/demo/experience/animated-product-surface.tsx");
  assert.match(animated, /DemoSceneStage/);
});

test("12 full-demo scenes expose data-testid hooks for browser smoke", () => {
  const stage = read("src/components/marketing/demo/demo-scene-stage.tsx");
  assert.match(stage, /data-testid=\{`demo-scene-\$\{scene\.id\}`\}/);
  const spec = read("e2e/interactive-demo-scenes-browser.spec.ts");
  assert.match(spec, /full-product-story/);
  assert.match(spec, /demo-scene-/);
  const cinematic = read("e2e/cinematic-demo-browser.spec.ts");
  assert.match(cinematic, /data-demo-experience/);
  const pkg = read("package.json");
  assert.match(pkg, /test:cinematic-demo-browser/);
});
