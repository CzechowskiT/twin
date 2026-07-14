/**
 * Static guard for /demo interactive player — autoplay, simulation copy, motion safety.
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
const i18n = read("src/lib/i18n.ts");
const globals = read("src/app/globals.css");

test("demo page mounts InteractiveDemoPlayer above journey catalog", () => {
  assert.match(demoPage, /DemoAboveFoldSection|InteractiveDemoPlayer/);
  assert.match(demoPage, /FounderLedDemoBelowFold/);
  assert.doesNotMatch(demoPage, /InteractiveDemoWalkthrough/);
  assert.doesNotMatch(demoPage, /DemoProductWalkthrough/);
  const playerIdx = demoPage.indexOf("DemoAboveFoldSection");
  const journeyIdx = demoPage.indexOf("FounderLedDemoBelowFold");
  assert.ok(playerIdx >= 0 && journeyIdx >= 0 && playerIdx < journeyIdx);
});

test("player autoplays on load with reduced-motion guard", () => {
  assert.match(player, /autoplayStartedRef/);
  assert.match(player, /prefers-reduced-motion/);
  assert.match(player, /setPlaying\(true\)/);
});

test("player exposes play/pause, restart, takeover, role tabs, timeline", () => {
  assert.match(player, /DemoControls/);
  assert.match(player, /DemoRoleSelector/);
  assert.match(player, /DemoTimeline/);
  assert.match(player, /DemoChapterNavigation/);
});

test("player uses synthetic fixtures and boundary note", () => {
  assert.match(player, /demo-scene-manifest/);
  assert.match(player, /boundaryNote/);
  assert.match(i18n, /SIMULATION · SAMPLE DATA ONLY/);
  assert.match(i18n, /SYMULACJA · TYLKO PRÓBKA/);
});

test("player respects prefers-reduced-motion CSS", () => {
  assert.match(globals, /@media \(prefers-reduced-motion: reduce\)/);
});

test("demo copy avoids forbidden live-apply claims", () => {
  const start = i18n.indexOf("interactiveDemoPlayer:");
  const end = i18n.indexOf("homepageCandidateStory:", start);
  const demoI18n = i18n.slice(start, end > start ? end : undefined);
  for (const pattern of FORBIDDEN_IN_DEMO) {
    assert(!pattern.test(player), `Forbidden in player: ${pattern}`);
    assert(!pattern.test(demoI18n), `Forbidden in i18n interactiveDemoPlayer: ${pattern}`);
  }
});

test("hero launch CTA keys exist in EN and PL", () => {
  assert.match(i18n, /heroCtaLaunch: "Launch demo"/);
  assert.match(i18n, /heroCtaLaunch: "Uruchom demo"/);
});
