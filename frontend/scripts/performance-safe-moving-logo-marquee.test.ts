import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  PERFORMANCE_SAFE_CURATED_LOGO_VISUALS,
  PERFORMANCE_SAFE_LOGO_APPLE_MARK_MAX_OPTICAL_SCALE,
  PERFORMANCE_SAFE_LOGO_NVIDIA_DOMINANCE_MAX_OPTICAL_SCALE,
  PERFORMANCE_SAFE_LOGO_READABILITY_MIN_OPTICAL_SCALE,
  PERFORMANCE_SAFE_LOGO_SALESFORCE_MIN_OPTICAL_SCALE,
} from "../src/lib/performance-safe-curated-logos";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_SHELL = [
  "src/components/lightweight-route-shell.tsx",
  "src/components/persona-workspace-gate.tsx",
  "src/components/workspace-route-layout.tsx",
  "src/app/dashboard/layout.tsx",
] as const;

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("1 safe marquee uses curated visual metadata for every brand", () => {
  const mark = read("src/components/marketing/performance-safe-logo-mark.tsx");
  assert.match(mark, /PERFORMANCE_SAFE_CURATED_LOGO_VISUALS|getPerformanceSafeCuratedLogoSpec/);
  assert.match(mark, /data-performance-safe-logo-mark/);
  assert.match(mark, /data-optical-scale/);
  assert.match(mark, /data-quality-status/);
  for (const slug of PERFORMANCE_SAFE_CURATED_LOGO_SLUGS) {
    const spec = PERFORMANCE_SAFE_CURATED_LOGO_VISUALS[slug];
    assert.equal(spec.id, slug);
    assert.equal(spec.qualityStatus, "verified-curated");
    assert.ok(spec.ariaLabel.length > 0);
    assert.ok(spec.opticalScale > 0 && spec.opticalScale <= 1);
  }
});

test("2 every brand has quality status verified-curated", () => {
  for (const slug of PERFORMANCE_SAFE_CURATED_LOGO_SLUGS) {
    assert.equal(PERFORMANCE_SAFE_CURATED_LOGO_VISUALS[slug].qualityStatus, "verified-curated");
  }
});

test("3 every brand has non-empty aria label", () => {
  for (const slug of PERFORMANCE_SAFE_CURATED_LOGO_SLUGS) {
    assert.ok(PERFORMANCE_SAFE_CURATED_LOGO_VISUALS[slug].ariaLabel.trim().length > 0);
  }
});

test("4 every brand has optical scale metadata", () => {
  for (const slug of PERFORMANCE_SAFE_CURATED_LOGO_SLUGS) {
    const scale = PERFORMANCE_SAFE_CURATED_LOGO_VISUALS[slug].opticalScale;
    assert.ok(typeof scale === "number" && scale >= 0.9 && scale <= 1);
  }
});

test("5 Salesforce scale is not below readable threshold", () => {
  const sf = PERFORMANCE_SAFE_CURATED_LOGO_VISUALS.salesforce.opticalScale;
  assert.ok(sf >= PERFORMANCE_SAFE_LOGO_SALESFORCE_MIN_OPTICAL_SCALE);
  assert.ok(sf >= PERFORMANCE_SAFE_LOGO_READABILITY_MIN_OPTICAL_SCALE);
});

test("6 NVIDIA scale is not above dominance threshold", () => {
  const nv = PERFORMANCE_SAFE_CURATED_LOGO_VISUALS.nvidia.opticalScale;
  assert.ok(nv <= PERFORMANCE_SAFE_LOGO_NVIDIA_DOMINANCE_MAX_OPTICAL_SCALE);
});

test("7 Apple mark scale is capped", () => {
  const apple = PERFORMANCE_SAFE_CURATED_LOGO_VISUALS.apple.opticalScale;
  assert.ok(apple <= PERFORMANCE_SAFE_LOGO_APPLE_MARK_MAX_OPTICAL_SCALE);
});

test("8 safe marquee renders 18–27 cards, max 30", () => {
  assert.equal(PERFORMANCE_SAFE_MARQUEE_SEGMENTS, 3);
  assert.ok(PERFORMANCE_SAFE_MARQUEE_MAX_DOM_NODES >= 18);
  assert.ok(PERFORMANCE_SAFE_MARQUEE_MAX_DOM_NODES <= 27);
  assert.ok(PERFORMANCE_SAFE_MARQUEE_MAX_DOM_NODES <= PERFORMANCE_SAFE_MARQUEE_HARD_MAX_DOM_NODES);
});

test("9 no 89-logo dataset imported on workspace/auth safe marquee", () => {
  const subset = read("src/lib/marquee-brand-subset.ts");
  const marquee = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  const full = read("src/components/marketing/company-logo-marquee.tsx");
  assert.doesNotMatch(subset, /MARQUEE_BRAND_ENTRIES/);
  assert.doesNotMatch(marquee, /brandLogoUrls/);
  assert.doesNotMatch(marquee, /SafeCompanyLogo/);
  assert.doesNotMatch(marquee, /company-logo-marquee/);
  const fullBrandCount = (full.match(/\{ slug:/g) ?? []).length;
  assert.ok(fullBrandCount >= 80);
  assert.equal(PERFORMANCE_SAFE_MARQUEE_BRANDS.length, PERFORMANCE_SAFE_CURATED_LOGO_SLUGS.length);
});

test("10 no will-change, backdrop-filter, backdrop-blur on safe track/cards", () => {
  const src = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  const mark = read("src/components/marketing/performance-safe-logo-mark.tsx");
  const css = read("src/app/globals.css");
  const blob = `${src}\n${mark}`;
  assert.doesNotMatch(blob, /will-change/);
  assert.doesNotMatch(blob, /backdrop-blur/);
  assert.doesNotMatch(blob, /backdrop-filter/);
  assert.doesNotMatch(css, /\.performance-safe-marquee-track[\s\S]{0,200}will-change/);
});

test("11 readability scale CSS targets 40–48px partner logo height band", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /\.partner-logo-card[\s\S]{0,200}min-height:\s*5rem/);
  assert.match(css, /\.partner-logo-card[\s\S]{0,320}min-width:\s*12rem/);
  assert.match(css, /\.partner-logo-card[\s\S]{0,400}padding:\s*1\.5rem 2rem/);
  assert.match(css, /\.performance-safe-logo-mark[\s\S]{0,200}height:\s*2\.5rem/);
  assert.match(
    css,
    /@media \(min-width: 768px\)[\s\S]{0,240}\.performance-safe-logo-mark[\s\S]{0,200}height:\s*3rem/,
  );
  assert.match(css, /\.partner-logo img[\s\S]{0,200}height:\s*2\.5rem/);
  assert.match(
    css,
    /@media \(min-width: 768px\)[\s\S]{0,240}\.partner-logo img[\s\S]{0,200}height:\s*3rem/,
  );
  const styles = read("src/lib/partner-logo-styles.ts");
  assert.match(styles, /PARTNER_LOGO_CARD_CLASS/);
  assert.match(styles, /partner-logo-card partner-logo/);
  const scales = PERFORMANCE_SAFE_CURATED_LOGO_SLUGS.map(
    (slug) => PERFORMANCE_SAFE_CURATED_LOGO_VISUALS[slug].opticalScale,
  );
  const minScale = Math.min(...scales);
  const maxScale = Math.max(...scales);
  assert.ok(maxScale / minScale <= 1.25, "dominance ratio must stay ≤1.25×");
  assert.ok(minScale / maxScale >= 0.75, "lightest mark must stay ≥0.75× heaviest");
});

test("12 hidden-tab pause preserved", () => {
  const src = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  const css = read("src/app/globals.css");
  assert.match(src, /usePageVisibility/);
  assert.match(css, /html\[data-page-hidden="true"\] \.performance-safe-marquee-track/);
  assert.match(css, /animation-play-state: paused/);
});

test("13 reduced-motion fallback preserved", () => {
  const src = read("src/components/marketing/performance-safe-moving-logo-marquee.tsx");
  const css = read("src/app/globals.css");
  assert.match(src, /useReducedMotionPreference/);
  assert.match(src, /staticMarquee/);
  assert.match(css, /html\[data-reduced-motion="true"\] \.performance-safe-marquee-track/);
});

test("14 seamless loop has at least 3 segments", () => {
  assert.ok(PERFORMANCE_SAFE_MARQUEE_SEGMENTS >= 3);
  const css = read("src/app/globals.css");
  assert.match(css, /calc\(-100% \/ var\(--performance-safe-marquee-segments/);
  assert.equal(PERFORMANCE_SAFE_MARQUEE_LOOP_TRANSLATE_PERCENT, 100 / 3);
});

test("15 no broken/empty logo content in renderer", () => {
  const mark = read("src/components/marketing/performance-safe-logo-mark.tsx");
  assert.match(mark, /PerformanceSafeLogoMark/);
  for (const slug of PERFORMANCE_SAFE_CURATED_LOGO_SLUGS) {
    assert.match(mark, new RegExp(`case "${slug}"`));
  }
  assert.doesNotMatch(mark, /<img/);
});

test("16 no route shell/gate/layout/fallback files touched", () => {
  const feature = [
    "src/components/marketing/performance-safe-moving-logo-marquee.tsx",
    "src/components/marketing/performance-safe-logo-mark.tsx",
    "src/lib/performance-safe-curated-logos.ts",
    "src/lib/marquee-brand-subset.ts",
  ]
    .map((p) => read(p))
    .join("\n");
  for (const forbidden of FORBIDDEN_SHELL) {
    assert.doesNotMatch(feature, new RegExp(forbidden.replace(/\//g, "\\/")));
  }
});

test("17 marketing full marquee lazy-loaded; site-top routes light chrome", () => {
  const siteTop = read("src/components/site-top-marquee.tsx");
  assert.match(siteTop, /PerformanceSafeMovingLogoMarquee/);
  assert.match(siteTop, /dynamic\(/);
  assert.doesNotMatch(siteTop, /import \{ CompanyLogoMarquee \}/);
});

test("18 package registers marquee tests", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:performance-safe-moving-logo-marquee/);
  assert.match(pkg, /test:performance-safe-moving-logo-marquee-browser/);
});
