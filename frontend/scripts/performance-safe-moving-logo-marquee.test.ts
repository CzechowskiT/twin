import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  PERFORMANCE_SAFE_MARQUEE_BRANDS,
  PERFORMANCE_SAFE_MARQUEE_CURATED_SLUGS,
  PERFORMANCE_SAFE_MARQUEE_HARD_MAX_DOM_NODES,
  PERFORMANCE_SAFE_MARQUEE_LOOP_TRANSLATE_PERCENT,
  PERFORMANCE_SAFE_MARQUEE_MAX_DOM_NODES,
  PERFORMANCE_SAFE_MARQUEE_SEGMENTS,
} from "../src/lib/marquee-brand-subset";
import {
  PERFORMANCE_SAFE_CURATED_LOGO_SLUGS,
  performanceSafeCuratedLogoUrl,
} from "../src/lib/performance-safe-curated-logos";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 PerformanceSafeMovingLogoMarquee exported with bounded segments", () => {
  const src = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  assert.match(src, /export function PerformanceSafeMovingLogoMarquee/);
  assert.match(src, /PERFORMANCE_SAFE_MARQUEE_SEGMENTS/);
  assert.match(src, /performance-safe-marquee-track/);
  assert.match(src, /performance-safe-marquee-segment/);
});

test("2 compact brand subset stays within 18–27 DOM nodes (9×3 segments)", () => {
  assert.ok(PERFORMANCE_SAFE_MARQUEE_BRANDS.length >= 6);
  assert.ok(PERFORMANCE_SAFE_MARQUEE_BRANDS.length <= 9);
  assert.equal(PERFORMANCE_SAFE_MARQUEE_SEGMENTS, 3);
  assert.ok(PERFORMANCE_SAFE_MARQUEE_MAX_DOM_NODES >= 18);
  assert.ok(PERFORMANCE_SAFE_MARQUEE_MAX_DOM_NODES <= 27);
  assert.ok(PERFORMANCE_SAFE_MARQUEE_MAX_DOM_NODES <= PERFORMANCE_SAFE_MARQUEE_HARD_MAX_DOM_NODES);
});

test("3 subset file does not import full 89-brand marquee array", () => {
  const subset = read("src/lib/marquee-brand-subset.ts");
  const full = read("src/components/marketing/company-logo-marquee.tsx");
  assert.doesNotMatch(subset, /MARQUEE_BRAND_ENTRIES/);
  assert.doesNotMatch(subset, /company-logo-marquee/);
  const fullBrandCount = (full.match(/\{ slug:/g) ?? []).length;
  const subsetBrandCount = (subset.match(/\{ slug:/g) ?? []).length;
  assert.ok(fullBrandCount >= 80);
  assert.ok(subsetBrandCount <= 9);
});

test("4 safe marquee pauses on hidden tab and reduced motion", () => {
  const src = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  assert.match(src, /usePageVisibility/);
  assert.match(src, /useReducedMotionPreference/);
  assert.match(src, /staticMarquee/);
  assert.match(src, /hidden/);
  assert.match(src, /reducedMotion/);
});

test("5 safe marquee avoids backdrop-blur and will-change", () => {
  const src = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  const css = read("src/app/globals.css");
  assert.doesNotMatch(src, /will-change/);
  assert.doesNotMatch(src, /backdrop-blur/);
  assert.doesNotMatch(src, /backdrop-filter/);
  assert.match(css, /\.performance-safe-marquee-track/);
  assert.doesNotMatch(css, /\.performance-safe-marquee-track[\s\S]{0,200}will-change/);
});

test("6 site-top-marquee routes workspace/auth to safe component", () => {
  const siteTop = read("src/components/site-top-marquee.tsx");
  assert.match(siteTop, /isPerformanceLightChromePath/);
  assert.match(siteTop, /PerformanceSafeMovingLogoMarquee/);
  assert.match(siteTop, /lightChrome/);
  assert.match(siteTop, /CompanyLogoMarquee/);
  assert.match(siteTop, /dynamic\(/);
});

test("7 marketing routes lazy-load full CompanyLogoMarquee only", () => {
  const siteTop = read("src/components/site-top-marquee.tsx");
  assert.doesNotMatch(siteTop, /import \{ CompanyLogoMarquee \}/);
  assert.match(siteTop, /import\("@\/components\/marketing\/company-logo-marquee"\)/);
  assert.match(siteTop, /dynamic\(/);
  assert.match(siteTop, /lightChrome \?/);
});

test("8 globals pause performance-safe track when hidden", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /html\[data-page-hidden="true"\] \.performance-safe-marquee-track/);
  assert.match(css, /html\[data-reduced-motion="true"\] \.performance-safe-marquee-track/);
  assert.match(css, /animation-play-state: paused/);
  assert.match(css, /@keyframes performance-safe-marquee/);
});

test("9 workspace route strips blur on safe marquee band", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /html\[data-workspace-route="true"\] \.performance-safe-logo-marquee/);
  assert.match(css, /backdrop-filter: none/);
});

test("10 performance route classification covers workspace and auth", () => {
  const classify = read("src/lib/performance-route-classification.ts");
  assert.match(classify, /isPerformanceLightChromePath/);
  assert.match(classify, /isWorkspacePath/);
  assert.match(classify, /isAuthPath/);
  assert.match(classify, /\/login/);
  assert.match(classify, /\/dashboard/);
});

test("11 PageVisibilitySync sets data-page-hidden for CSS pause", () => {
  const sync = read("src/components/page-visibility-sync.tsx");
  const providers = read("src/components/providers.tsx");
  assert.match(sync, /data-page-hidden/);
  assert.match(providers, /PageVisibilitySync/);
});

test("12 package registers performance-safe marquee tests", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:performance-safe-moving-logo-marquee/);
  assert.match(pkg, /performance-safe-moving-logo-marquee\.test\.ts/);
  assert.match(pkg, /test:performance-safe-moving-logo-marquee-browser/);
});

test("13 safe marquee uses curated local logos only (no CDN fallback)", () => {
  const src = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  assert.match(src, /performanceSafeCuratedLogoUrls/);
  assert.doesNotMatch(src, /brandLogoUrls/);
  assert.equal(PERFORMANCE_SAFE_CURATED_LOGO_SLUGS.length, PERFORMANCE_SAFE_MARQUEE_BRANDS.length);
  for (const slug of PERFORMANCE_SAFE_MARQUEE_CURATED_SLUGS) {
    const path = join(root, "public", performanceSafeCuratedLogoUrl(slug).replace(/^\//, ""));
    assert.ok(existsSync(path), `missing curated SVG for ${slug}: ${path}`);
  }
});

test("14 seamless loop translates exactly one segment width", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /--performance-safe-marquee-segments/);
  assert.match(css, /calc\(-100% \/ var\(--performance-safe-marquee-segments/);
  assert.equal(PERFORMANCE_SAFE_MARQUEE_LOOP_TRANSLATE_PERCENT, 100 / 3);
  const src = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  assert.match(src, /--performance-safe-marquee-segments/);
});
