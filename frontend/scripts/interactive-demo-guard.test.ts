/**
 * Interactive /demo sales experience — component, i18n, launch stance, and route guards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dictionaries, en } from "../src/lib/i18n";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_DEMO_COPY = [
  /\bauto-apply is live\b/i,
  /\bStripe LIVE\b/i,
  /\bapplies automatically\b/i,
  /\bwe message candidates automatically\b/i,
];

const LEGACY_DEMO_IMPORTS = [
  /FounderLedDemoBelowFold/,
  /InteractiveDemoWalkthrough/,
  /InteractiveDemoSystemMap/,
  /DemoSurfaceCatalog/,
  /InteractiveDemoPlayer/,
  /from "@\/components\/marketing\/demo\/experience\/demo-experience"/,
  /from "@\/components\/marketing\/demo\/interactive-demo-player"/,
];

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("1 demo page wires SalesDemoExperience stack", () => {
  const page = read("src/app/(marketing)/demo/page.tsx");
  assert.match(page, /SalesDemoExperience/);
  assert.match(page, /DemoPilotCta/);
  for (const pattern of LEGACY_DEMO_IMPORTS) {
    assert.doesNotMatch(page, pattern, String(pattern));
  }
});

test("2 manifest module is single source for role flows", () => {
  assert.ok(existsSync(join(root, "src/lib/demo/demo-scene-manifest.ts")));
  const roleStory = read("src/components/marketing/demo/experience/role-story.tsx");
  assert.match(roleStory, /demo-scene-manifest/);
  const sales = read("src/components/marketing/demo/sales/sales-demo-experience.tsx");
  assert.match(sales, /salesRoleJourneyScenes|InteractiveRoleFlow/);
});

test("3 analytics wrapper avoids PII props", () => {
  const analytics = read("src/lib/demo/demo-analytics.ts");
  assert.match(analytics, /trackEvent/);
  assert.match(analytics, /demo_video_impression/);
  assert.match(analytics, /demo_cta_click/);
  assert.match(analytics, /demo_role_select/);
  assert.match(analytics, /demo_audio_impression/);
  assert.doesNotMatch(analytics, /email/);
});

test("4 reduced motion and save-data guards present in sales experience", () => {
  const experience = read("src/components/marketing/demo/sales/sales-demo-experience.tsx");
  assert.match(experience, /prefers-reduced-motion/);
  assert.match(experience, /readSaveDataPreference/);
  assert.match(experience, /data-demo-poster-fallback/);
  const saveDataLib = read("src/lib/demo/save-data-preference.ts");
  assert.match(saveDataLib, /prefers-reduced-data/);
  assert.match(saveDataLib, /navigatorConnection/);
  const roleStory = read("src/components/marketing/demo/experience/role-story.tsx");
  assert.match(roleStory, /autoplayStartedRef/);
});

test("5 i18n demoSales and demoCockpit keys mirrored EN/PL", () => {
  const enKeys = Object.keys(en.demoSales);
  const plKeys = Object.keys(dictionaries.pl.demoSales);
  assert.deepEqual(plKeys.sort(), enKeys.sort());
  const enCockpit = Object.keys(en.demoCockpit);
  const plCockpit = Object.keys(dictionaries.pl.demoCockpit);
  assert.deepEqual(plCockpit.sort(), enCockpit.sort());
});

test("6 launch stance — demo copy has no hard-banned CTAs", () => {
  const blob = [
    read("src/components/marketing/demo/sales/sales-demo-experience.tsx"),
    read("src/components/marketing/demo/experience/outcome-screen.tsx"),
    read("src/components/marketing/demo/demo-pilot-cta.tsx"),
    JSON.stringify(en.demoSales),
    JSON.stringify(dictionaries.pl.demoSales),
  ].join("\n");
  for (const pattern of FORBIDDEN_DEMO_COPY) {
    assert.doesNotMatch(blob, pattern, String(pattern));
  }
});

test("7 bundle imports stay marketing-local", () => {
  const experience = read("src/components/marketing/demo/sales/sales-demo-experience.tsx");
  assert.doesNotMatch(experience, /from "@\/app\/api/);
  assert.doesNotMatch(experience, /fetch\(/);
});

test("8 video controls exposed on product film player", () => {
  const player = read("src/components/marketing/demo/sales/product-film-player.tsx");
  assert.match(player, /data-demo-video-play/);
  assert.match(player, /data-demo-video-pause/);
  assert.match(player, /data-demo-video-skip/);
  assert.match(player, /data-demo-video-captions/);
  assert.match(player, /data-demo-product-video/);
  assert.match(player, /data-demo-video-poster-underlay/);
  assert.match(player, /type="video\/mp4"/);
});

test("9 demo fixtures use synthetic IDs only", () => {
  const fixtures = read("src/lib/demo/demo-fixtures.ts");
  assert.match(fixtures, /demo-candidate-001/);
  assert.doesNotMatch(fixtures, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
});

test("10 full-demo scenes render rich product surfaces not text-only", () => {
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

test("11 sales demo e2e hooks for browser smoke", () => {
  const founderSpec = read("e2e/founder-led-demo-flow-browser.spec.ts");
  assert.match(founderSpec, /data-sales-demo-hero/);
  assert.match(founderSpec, /data-demo-product-video/);
  assert.match(founderSpec, /data-sales-demo-roles/);

  const saveDataSpec = read("e2e/demo-save-data-fallback-browser.spec.ts");
  assert.match(saveDataSpec, /saveData: true/);
  assert.match(saveDataSpec, /data-demo-poster-fallback/);
  assert.match(saveDataSpec, /data-sales-demo-roles/);
  assert.match(founderSpec, /toHaveCount\(0\)/);
  assert.doesNotMatch(founderSpec, /data-founder-led-demo-link/);
  assert.match(founderSpec, /data-interactive-role-flow/);

  const interactiveFlowSpec = read("e2e/interactive-demo-flow-browser.spec.ts");
  assert.match(interactiveFlowSpec, /data-demo-flow-phase/);
  assert.match(interactiveFlowSpec, /data-demo-audio-toggle/);

  const a11ySpec = read("e2e/interactive-demo-a11y.spec.ts");
  assert.match(a11ySpec, /data-sales-demo/);
  assert.doesNotMatch(a11ySpec, /data-interactive-demo-player/);

  const realVideoSpec = read("e2e/real-video-demo-browser.spec.ts");
  assert.match(realVideoSpec, /data-sales-demo-hero/);
  assert.match(realVideoSpec, /data-demo-product-video/);
});

test("12 architecture guard blocks legacy demo return on /demo route", () => {
  const page = read("src/app/(marketing)/demo/page.tsx");
  const forbidden = [
    ...LEGACY_DEMO_IMPORTS,
    /data-founder-led-demo/,
    /data-demo-opening-film/,
    /data-interactive-demo-player/,
    /FounderLedDemoHero/,
  ];
  for (const pattern of forbidden) {
    assert.doesNotMatch(page, pattern, String(pattern));
  }
  const sales = read("src/components/marketing/demo/sales/sales-demo-experience.tsx");
  const roles = read("src/components/marketing/demo/sales/role-flow-cards.tsx");
  assert.match(sales, /data-sales-demo-hero/);
  assert.match(roles, /data-sales-demo-roles/);
});
