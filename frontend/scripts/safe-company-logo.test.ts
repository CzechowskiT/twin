/**
 * Unit tests for external company logo fallback helpers (no network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  advanceLogoFallbackStep,
  brandLogoUrls,
  companyInitials,
  type Brand,
} from "../src/lib/brand-logo-urls";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function testCompanyInitials() {
  assert.equal(companyInitials("Apple"), "AP");
  assert.equal(companyInitials("JPMorgan Chase"), "JC");
  assert.equal(companyInitials("  Meta  "), "ME");
}

function testAdvanceLogoFallbackStep() {
  assert.equal(advanceLogoFallbackStep(0, 3), 1);
  assert.equal(advanceLogoFallbackStep(1, 3), 2);
  assert.equal(advanceLogoFallbackStep(2, 3), null);
  assert.equal(advanceLogoFallbackStep(0, 0), null);
}

function testBrandLogoUrlsOrder() {
  const brand: Brand = {
    slug: "capitalone",
    name: "Capital One",
    domain: "capitalone.com",
    altSlugs: ["chase"],
    extraUrls: ["https://example.com/custom.ico"],
  };
  const urls = brandLogoUrls(brand);
  assert.ok(urls[0]?.includes("example.com/custom"));
  assert.ok(urls.some((u) => u.includes("duckduckgo.com")));
  assert.ok(urls.some((u) => u.includes("google.com/s2/favicons")));
  assert.ok(urls.some((u) => u.includes("cdn.simpleicons.org/capitalone")));
  assert.equal(new Set(urls).size, urls.length);
}

function testMarqueeUsesSafeLogoNotNextImage() {
  const marquee = readFileSync(
    join(root, "src/components/marketing/company-logo-marquee.tsx"),
    "utf8",
  );
  const safe = readFileSync(
    join(root, "src/components/marketing/safe-company-logo.tsx"),
    "utf8",
  );
  assert.doesNotMatch(marquee, /from\s+["']next\/image["']/);
  assert.match(marquee, /SafeCompanyLogo/);
  assert.match(safe, /<img/);
  assert.doesNotMatch(safe, /from\s+["']next\/image["']/);
}

function main() {
  testCompanyInitials();
  testAdvanceLogoFallbackStep();
  testBrandLogoUrlsOrder();
  testMarqueeUsesSafeLogoNotNextImage();
  console.log("safe-company-logo.test.ts: OK");
}

main();
