import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  PERFORMANCE_SAFE_CURATED_LOGO_VISUALS,
  getPerformanceSafeCuratedLogoSpec,
} from "../src/lib/performance-safe-curated-logos";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

const MARK_PATH = "src/components/marketing/performance-safe-logo-mark.tsx";

/**
 * Regression guard for the NVIDIA partner chip: it previously rendered a
 * bare green accent rect (first a clipped 2.8x11.5 line, then a rounded
 * square in PR #359) standing in for a real logo mark. No licensed NVIDIA
 * asset exists in this repo, so the chip must render as plain text only —
 * never a pseudo-icon/accent shape.
 */

test("1 NvidiaAccent pseudo-logo helper no longer exists", () => {
  const mark = read(MARK_PATH);
  assert.doesNotMatch(mark, /NvidiaAccent/);
});

test("2 nvidia case renders text-only, no icon/rect/path/g wrapper", () => {
  const mark = read(MARK_PATH);
  const caseMatch = mark.match(/case "nvidia":([\s\S]*?)case "meta":/);
  assert.ok(caseMatch, "nvidia case block must exist before the meta case");
  const nvidiaBlock = caseMatch[1];
  assert.doesNotMatch(nvidiaBlock, /<rect/);
  assert.doesNotMatch(nvidiaBlock, /<path/);
  assert.doesNotMatch(nvidiaBlock, /<g\s/);
  assert.doesNotMatch(nvidiaBlock, /<g>/);
  assert.match(nvidiaBlock, /<text/);
  assert.match(nvidiaBlock, />\s*NVIDIA\s*<\/text>/);
});

test("3 no standalone green (#76B900) accent shape anywhere in the mark renderer", () => {
  const mark = read(MARK_PATH);
  // The brand color may still be used as text `fill`, but never on a
  // <rect>/<path>/<circle> pseudo-icon shape (case-insensitive hex).
  const shapeWithNvidiaGreen =
    /<(rect|path|circle|polygon)\b[^>]*fill=["']#76[bB]900["']/;
  assert.doesNotMatch(mark, shapeWithNvidiaGreen);
});

test("4 nvidia curated visual spec is a plain wordmark", () => {
  const spec = getPerformanceSafeCuratedLogoSpec("nvidia");
  assert.ok(spec);
  assert.equal(spec?.renderType, "wordmark");
  assert.equal(spec?.qualityStatus, "verified-curated");
  assert.equal(spec?.displayName, "NVIDIA");
  assert.ok(spec && spec.opticalScale > 0 && spec.opticalScale <= 1);
});

test("5 no unofficial NVIDIA SVG asset shipped in public assets", () => {
  const unofficialAsset = join(root, "public/logos/marquee-curated/nvidia.svg");
  assert.equal(
    existsSync(unofficialAsset),
    false,
    "no unlicensed/from-memory NVIDIA SVG should exist in the repo",
  );
});

test("6 nvidia slug still registered with curated metadata (chip not silently dropped)", () => {
  assert.ok(PERFORMANCE_SAFE_CURATED_LOGO_VISUALS.nvidia);
  assert.equal(PERFORMANCE_SAFE_CURATED_LOGO_VISUALS.nvidia.id, "nvidia");
});

test("7 fix stays frontend-only: no backend/api/auth/db/env touched", () => {
  const mark = read(MARK_PATH);
  const curated = read("src/lib/performance-safe-curated-logos.ts");
  const blob = `${mark}\n${curated}`;
  assert.doesNotMatch(blob, /\bfetch\(/);
  assert.doesNotMatch(blob, /process\.env/);
  assert.doesNotMatch(blob, /\/api\//);
  assert.doesNotMatch(blob, /prisma|drizzle|\bSELECT\b|\bINSERT\b/i);
});

test("8 no Gate E / Phase3B / Playwright coupling introduced by this fix", () => {
  const mark = read(MARK_PATH);
  const curated = read("src/lib/performance-safe-curated-logos.ts");
  const blob = `${mark}\n${curated}`;
  assert.doesNotMatch(blob, /gate-e|gateE|phase3b|Phase3B/i);
  assert.doesNotMatch(blob, /playwright/i);
});

test("9 other brand chips untouched by the NVIDIA-only fix", () => {
  const mark = read(MARK_PATH);
  for (const [slug, needle] of [
    ["apple", ">\\s*Apple\\s*<\\/text>"],
    ["microsoft", "MicrosoftSquares"],
    ["google", "#4285F4"],
    ["amazon", "AmazonSmile"],
    ["meta", ">\\s*Meta\\s*<\\/text>"],
    ["visa", ">\\s*VISA\\s*<\\/text>"],
    ["salesforce", ">\\s*salesforce\\s*<\\/text>"],
    ["netflix", ">\\s*NETFLIX\\s*<\\/text>"],
  ] as const) {
    assert.match(mark, new RegExp(needle), `${slug} render path must be unchanged`);
  }
});

test("10 package registers the nvidia logo chip rendering test", () => {
  const pkg = read("package.json");
  assert.match(pkg, /test:nvidia-logo-chip-rendering/);
});
