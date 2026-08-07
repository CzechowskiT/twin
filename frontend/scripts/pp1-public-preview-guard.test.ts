/** PP1 — Public read-only synthetic preview guards. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PUBLIC_PREVIEW_AREAS,
  PUBLIC_PREVIEW_FIXTURE_VERSION,
  PUBLIC_PREVIEW_MARKERS,
} from "../src/lib/public-preview-fixture.ts";
import {
  PUBLIC_PREVIEW_VALUE,
  isAllowlistedPreviewScenario,
  isPublicPreviewEnabled,
  publicPreviewStatus,
} from "../src/lib/public-preview-gate.ts";
import {
  PUBLIC_PREVIEW_MESSAGES_EN,
  PUBLIC_PREVIEW_MESSAGES_PL,
} from "../src/lib/public-preview-messages.ts";

assert.equal(PUBLIC_PREVIEW_VALUE, "READ_ONLY_SYNTHETIC");
assert.equal(PUBLIC_PREVIEW_AREAS.length, 7);
assert.equal(PUBLIC_PREVIEW_FIXTURE_VERSION, "demo_scenario_v1");
assert.ok(isAllowlistedPreviewScenario("demo_scenario_v1"));
assert.equal(isAllowlistedPreviewScenario("prod_leak"), false);
assert.ok(PUBLIC_PREVIEW_MARKERS.synthetic.includes("SYNTHETIC"));
assert.ok(PUBLIC_PREVIEW_MARKERS.simulated.includes("NO REAL STATE CHANGE"));

for (const key of Object.keys(PUBLIC_PREVIEW_MESSAGES_EN) as (keyof typeof PUBLIC_PREVIEW_MESSAGES_EN)[]) {
  assert.equal(typeof PUBLIC_PREVIEW_MESSAGES_PL[key], "string");
}

const root = join(import.meta.dirname, "..");
const page = readFileSync(join(root, "src/app/preview/page.tsx"), "utf8");
assert.ok(page.includes("isPublicPreviewEnabled"));
assert.ok(page.includes("robots"));
assert.ok(!page.includes("fetch("));
assert.ok(!page.includes("/api/v1/"));

const surface = readFileSync(
  join(root, "src/components/public-preview/public-preview-surface.tsx"),
  "utf8",
);
assert.ok(surface.includes("SYNTHETIC PRODUCT PREVIEW") || surface.includes("markerSynthetic"));
assert.ok(surface.includes("SIMULATED — NO REAL STATE CHANGE") || surface.includes("simulatedFlash"));
assert.ok(!surface.includes("localStorage"));
assert.ok(!surface.includes("sessionStorage"));
assert.ok(!surface.includes("indexedDB"));
assert.ok(!/fetch\s*\(/.test(surface));

const middleware = readFileSync(join(root, "src/middleware.ts"), "utf8");
assert.ok(middleware.includes("X-Robots-Tag"));
assert.ok(middleware.includes("noindex"));
assert.ok(middleware.includes("isPublicPreviewEnabled"));
assert.ok(middleware.includes("private, no-store"));

const robots = readFileSync(join(root, "src/app/robots.ts"), "utf8");
assert.ok(robots.includes('"/preview"'));

const sitemap = readFileSync(join(root, "src/app/sitemap.ts"), "utf8");
assert.ok(!sitemap.includes("/preview"));

const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
assert.ok(nextConfig.includes("PREVIEW_CSP_POLICY"));
assert.ok(nextConfig.includes("no-referrer"));

// Kill switch default (unset) must be inactive in this process unless CI sets it.
if (!process.env.NEXT_PUBLIC_PUBLIC_PREVIEW) {
  assert.equal(isPublicPreviewEnabled(), false);
  assert.equal(publicPreviewStatus(), "READY_INACTIVE");
} else if (process.env.NEXT_PUBLIC_PUBLIC_PREVIEW === "READ_ONLY_SYNTHETIC") {
  assert.equal(isPublicPreviewEnabled(), true);
  assert.equal(publicPreviewStatus(), "ENABLED");
}

console.log("pp1-public-preview-guard: ok");
