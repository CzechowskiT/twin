/**
 * Static guard for /demo interactive walkthrough — 8 steps, simulation copy, motion safety.
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
const walkthrough = read("src/components/marketing/interactive-demo-walkthrough.tsx");
const i18n = read("src/lib/i18n.ts");
const globals = read("src/app/globals.css");

test("demo page mounts interactive walkthrough component", () => {
  assert.match(demoPage, /InteractiveDemoWalkthrough/);
  assert.doesNotMatch(demoPage, /DemoProductWalkthrough/);
});

test("walkthrough defines eight steps with next/back and progress", () => {
  assert.match(walkthrough, /STEP_COUNT = 8/);
  assert.match(walkthrough, /interactiveDemo\.back/);
  assert.match(walkthrough, /interactiveDemo\.next/);
  assert.match(walkthrough, /role="progressbar"/);
  assert.match(walkthrough, /interactiveDemo\.autoplay/);
});

test("walkthrough uses synthetic data only and simulation label", () => {
  assert.match(walkthrough, /demo-walkthrough-data/);
  assert.match(walkthrough, /interactiveDemo\.simulationLabel/);
  assert.match(walkthrough, /interactiveDemo\.calendarSimulation/);
  assert.match(i18n, /SIMULATION · SAMPLE DATA ONLY/);
  assert.match(i18n, /SYMULACJA · TYLKO PRÓBKA/);
});

test("walkthrough respects prefers-reduced-motion", () => {
  assert.match(walkthrough, /prefers-reduced-motion/);
  assert.match(globals, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(globals, /\.interactive-demo-step-enter/);
});

test("demo copy avoids forbidden live-apply claims", () => {
  const start = i18n.indexOf("interactiveDemo:");
  const end = i18n.indexOf("interactiveDemoPlayer:", start);
  const demoI18n = i18n.slice(start, end > start ? end : undefined);
  for (const pattern of FORBIDDEN_IN_DEMO) {
    assert(!pattern.test(walkthrough), `Forbidden in walkthrough: ${pattern}`);
    assert(!pattern.test(demoI18n), `Forbidden in i18n interactiveDemo: ${pattern}`);
  }
});

test("eight step title keys exist in EN and PL", () => {
  for (let i = 1; i <= 8; i += 1) {
    assert.match(i18n, new RegExp(`step${i}Title:`));
  }
});
