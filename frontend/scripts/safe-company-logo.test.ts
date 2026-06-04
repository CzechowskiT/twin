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
  FAVICON_INITIALS_ONLY_DOMAINS,
  isStableMarqueeSiSlug,
  MARQUEE_STABLE_SI_SLUGS,
  shouldUseInitialsOnlyLogo,
  type Brand,
} from "../src/lib/brand-logo-urls";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const RASTER_FAVICON_RE = /google\.com\/s2\/favicons|gstatic\.com|duckduckgo\.com/;

function assertNoRasterFaviconUrls(urls: readonly string[], label: string) {
  for (const url of urls) {
    assert.doesNotMatch(url, RASTER_FAVICON_RE, `${label}: ${url}`);
  }
}

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
  assert.ok(urls.some((u) => u.includes("cdn.simpleicons.org/capitalone")));
  assertNoRasterFaviconUrls(urls, "capitalone");
  assert.equal(new Set(urls).size, urls.length);
}

function testAllowlistedStableGetsSiOnly() {
  const brand: Brand = { slug: "apple", name: "Apple", domain: "apple.com" };
  const urls = brandLogoUrls(brand);
  assert.ok(urls.length > 0);
  assert.ok(isStableMarqueeSiSlug("apple"));
  assert.ok(urls.some((u) => u.includes("cdn.simpleicons.org/apple")));
  assert.ok(urls.some((u) => u.includes("cdn.jsdelivr.net")));
  assertNoRasterFaviconUrls(urls, "apple");
}

function testUncertainDomainsNoRasterFavicons() {
  const brand: Brand = {
    slug: "notonmarqueeallowlist",
    name: "Uncertain Corp",
    domain: "uncertain.example",
  };
  const urls = brandLogoUrls(brand);
  assert.equal(urls.length, 0);
  assertNoRasterFaviconUrls(urls, "uncertain");
}

function testBlocklistedDomainsInitialsOnly() {
  for (const domain of FAVICON_INITIALS_ONLY_DOMAINS) {
    assert.ok(shouldUseInitialsOnlyLogo(domain));
    const urls = brandLogoUrls({
      slug: domain.replace(".com", ""),
      name: domain,
      domain,
    });
    assert.equal(urls.length, 0, domain);
    assertNoRasterFaviconUrls(urls, domain);
  }
}

function testInitialsOnlyDomainsExcludedFromStableSlugs() {
  assert.ok(!MARQUEE_STABLE_SI_SLUGS.has("homedepot"));
  assert.ok(!MARQUEE_STABLE_SI_SLUGS.has("chevron"));
  assert.ok(!MARQUEE_STABLE_SI_SLUGS.has("servicenow"));
  assert.ok(!MARQUEE_STABLE_SI_SLUGS.has("humana"));
  assert.ok(!MARQUEE_STABLE_SI_SLUGS.has("cvs"));
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
  testAllowlistedStableGetsSiOnly();
  testUncertainDomainsNoRasterFavicons();
  testBlocklistedDomainsInitialsOnly();
  testInitialsOnlyDomainsExcludedFromStableSlugs();
  testMarqueeUsesSafeLogoNotNextImage();
  console.log("safe-company-logo.test.ts: OK");
}

main();
