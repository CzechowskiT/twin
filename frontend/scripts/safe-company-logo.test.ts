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
  isMarqueeLocalLogoSlug,
  isStableMarqueeSiSlug,
  localMarqueeLogoUrl,
  MARQUEE_BRAND_LOGO_MAP,
  MARQUEE_LOCAL_LOGO_SLUGS,
  MARQUEE_STABLE_SI_SLUGS,
  MARQUEE_VERIFIED_SI_SLUGS,
  resolveMarqueeLogoSlugs,
  shouldUseInitialsOnlyLogo,
  SI_CDN_UNAVAILABLE_SLUGS,
  slugVectorUrls,
  type Brand,
} from "../src/lib/brand-logo-urls";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const RASTER_FAVICON_RE =
  /google\.com\/s2\/favicons|gstatic\.com|faviconV2|duckduckgo\.com/;

function assertNoRasterFaviconUrls(urls: readonly string[], label: string) {
  for (const url of urls) {
    assert.doesNotMatch(url, RASTER_FAVICON_RE, `${label}: ${url}`);
  }
}

function assertNoForcedBlackLogoUrls(urls: readonly string[], label: string) {
  for (const url of urls) {
    assert.ok(!url.endsWith("/000000"), `${label}: forced black: ${url}`);
    assert.ok(!url.includes("/000000"), `${label}: forced black: ${url}`);
  }
}

function parseMarqueeBrands(): Array<{ slug: string; name: string; domain: string }> {
  const marquee = readFileSync(
    join(root, "src/components/marketing/company-logo-marquee.tsx"),
    "utf8",
  );
  return [
    ...marquee.matchAll(
      /\{\s*slug:\s*"([^"]+)"[^}]*name:\s*"([^"]+)"[^}]*domain:\s*"([^"]+)"/g,
    ),
  ].map(([, slug, name, domain]) => ({ slug, name, domain }));
}

function testCompanyInitials() {
  assert.equal(companyInitials("Apple"), "AP");
  assert.equal(companyInitials("JPMorgan Chase"), "JC");
  assert.equal(companyInitials("  Meta  "), "ME");
  assert.equal(companyInitials("RTX"), "RTX");
  assert.equal(companyInitials("Chevron"), "CH");
  assert.equal(companyInitials("Home Depot"), "HD");
  assert.equal(companyInitials("CVS"), "CVS");
  assert.equal(companyInitials("Wells Fargo"), "WF");
  assert.equal(companyInitials("GE"), "GE");
}

function testAdvanceLogoFallbackStep() {
  assert.equal(advanceLogoFallbackStep(0, 3), 1);
  assert.equal(advanceLogoFallbackStep(1, 3), 2);
  assert.equal(advanceLogoFallbackStep(2, 3), null);
  assert.equal(advanceLogoFallbackStep(0, 0), null);
}

function testBrandLogoUrlsOrder() {
  const brand: Brand = {
    slug: "jpmorgan",
    name: "JPMorgan Chase",
    domain: "jpmorganchase.com",
    extraUrls: ["https://example.com/custom.ico"],
  };
  const urls = brandLogoUrls(brand);
  assert.ok(urls[0]?.includes("example.com/custom"));
  assert.ok(urls.some((u) => u === "https://cdn.simpleicons.org/chase"));
  assert.ok(urls.some((u) => u.includes("cdn.jsdelivr.net/npm/simple-icons@11.14.0/icons/chase")));
  assertNoForcedBlackLogoUrls(urls, "chase");
  assertNoRasterFaviconUrls(urls, "chase");
  assert.equal(new Set(urls).size, urls.length);
}

const MIN_MARQUEE_STABLE_LOGO_BRANDS = 40;

const ALLOWED_LOGO_URL =
  /^(https:\/\/cdn\.jsdelivr\.net\/npm\/simple-icons@11\.14\.0\/icons\/[a-z0-9-]+\.svg|https:\/\/cdn\.simpleicons\.org\/[a-z0-9-]+|\/logos\/marquee\/[a-z0-9-]+\.svg)$/;

function assertAllowedLogoUrls(urls: readonly string[], label: string) {
  for (const url of urls) {
    assert.match(url, ALLOWED_LOGO_URL, `${label}: ${url}`);
    assertNoForcedBlackLogoUrls([url], label);
  }
}

function testMarqueeStableLogoCoverage() {
  const blocks = parseMarqueeBrands();
  let withStableUrls = 0;
  for (const { slug, name, domain } of blocks) {
    const urls = brandLogoUrls({ slug, name, domain });
    if (urls.length > 0) {
      withStableUrls += 1;
      assertAllowedLogoUrls(urls, `${slug}/${domain}`);
    }
  }
  assert.ok(
    withStableUrls >= MIN_MARQUEE_STABLE_LOGO_BRANDS,
    `expected >= ${MIN_MARQUEE_STABLE_LOGO_BRANDS} marquee brands with SI URLs, got ${withStableUrls}`,
  );
}

function testMarqueeBrandLogoMapKeys() {
  const blocks = parseMarqueeBrands();
  for (const { slug, name, domain } of blocks) {
    const mapped = MARQUEE_BRAND_LOGO_MAP[domain];
    const resolved = resolveMarqueeLogoSlugs({ slug, name, domain });
    if (mapped) {
      assert.ok(
        isStableMarqueeSiSlug(mapped),
        `map target must be verified: ${domain} -> ${mapped}`,
      );
      assert.ok(
        resolved.includes(mapped),
        `resolve must include map slug for ${domain}`,
      );
    }
  }
}

function testVerifiedFixtureMatchesAllowlist() {
  for (const slug of MARQUEE_VERIFIED_SI_SLUGS) {
    assert.ok(
      isStableMarqueeSiSlug(slug),
      `MARQUEE_VERIFIED_SI_SLUGS must ⊆ MARQUEE_STABLE_SI_SLUGS: ${slug}`,
    );
  }
  for (const slug of Object.values(MARQUEE_BRAND_LOGO_MAP)) {
    assert.ok(MARQUEE_VERIFIED_SI_SLUGS.includes(slug), `map slug in fixture: ${slug}`);
  }
}

function testSmokeBrandsProduceUrlsWhenMapped() {
  const smoke: Array<{ domain: string; slug: string; expectUrl: boolean }> = [
    { domain: "bankofamerica.com", slug: "bankofamerica", expectUrl: true },
    { domain: "goldmansachs.com", slug: "goldmansachs", expectUrl: true },
    { domain: "wellsfargo.com", slug: "wellsfargo", expectUrl: true },
    { domain: "americanexpress.com", slug: "americanexpress", expectUrl: true },
    { domain: "walmart.com", slug: "walmart", expectUrl: true },
    { domain: "target.com", slug: "target", expectUrl: true },
    { domain: "mastercard.com", slug: "mastercard", expectUrl: true },
    { domain: "starbucks.com", slug: "starbucks", expectUrl: true },
    { domain: "nike.com", slug: "nike", expectUrl: true },
    { domain: "adidas.com", slug: "adidas", expectUrl: true },
    { domain: "shell.com", slug: "shell", expectUrl: true },
    { domain: "intel.com", slug: "intel", expectUrl: true },
    { domain: "toyota.com", slug: "toyota", expectUrl: true },
    { domain: "bmw.com", slug: "bmw", expectUrl: true },
    { domain: "volkswagen.com", slug: "volkswagen", expectUrl: true },
    { domain: "tesla.com", slug: "tesla", expectUrl: true },
    { domain: "ups.com", slug: "ups", expectUrl: true },
    { domain: "fedex.com", slug: "fedex", expectUrl: true },
    { domain: "coca-cola.com", slug: "cocacola", expectUrl: true },
    { domain: "costco.com", slug: "costco", expectUrl: false },
    { domain: "pfizer.com", slug: "pfizer", expectUrl: false },
    { domain: "pepsi.com", slug: "pepsi", expectUrl: false },
  ];
  for (const { domain, slug, expectUrl } of smoke) {
    const urls = brandLogoUrls({ slug, name: slug, domain });
    if (expectUrl) {
      assert.ok(urls.length > 0, `smoke brand should have URLs: ${domain}`);
      assertAllowedLogoUrls(urls, domain);
      if (!SI_CDN_UNAVAILABLE_SLUGS.has(slug)) {
        assert.ok(
          urls[0]?.startsWith("https://cdn.simpleicons.org/"),
          `brand-colored SI CDN first: ${domain}`,
        );
      }
      assertNoForcedBlackLogoUrls(urls, domain);
    } else {
      assert.equal(urls.length, 0, `no SI at 11.14.0: ${domain}`);
    }
  }
}

function testFounderScreenshotBrandsPreferColoredSiFirst() {
  const founder: Array<{ domain: string; slug: string }> = [
    { domain: "bankofamerica.com", slug: "bankofamerica" },
    { domain: "goldmansachs.com", slug: "goldmansachs" },
    { domain: "wellsfargo.com", slug: "wellsfargo" },
    { domain: "americanexpress.com", slug: "americanexpress" },
    { domain: "walmart.com", slug: "walmart" },
    { domain: "target.com", slug: "target" },
    { domain: "mastercard.com", slug: "mastercard" },
    { domain: "starbucks.com", slug: "starbucks" },
    { domain: "nike.com", slug: "nike" },
    { domain: "adidas.com", slug: "adidas" },
    { domain: "shell.com", slug: "shell" },
  ];
  for (const { domain, slug } of founder) {
    const urls = brandLogoUrls({ slug, name: slug, domain });
    assert.ok(urls.length > 0, `founder brand must have logo URLs: ${domain}`);
    if (!SI_CDN_UNAVAILABLE_SLUGS.has(slug)) {
      assert.equal(urls[0], `https://cdn.simpleicons.org/${slug}`, `colored SI first: ${domain}`);
    }
    assertNoForcedBlackLogoUrls(urls, domain);
  }
}

function testWalmartSkipsBrokenSiCdnAndHasFallbacks() {
  const urls = brandLogoUrls({ slug: "walmart", name: "Walmart", domain: "walmart.com" });
  assert.ok(urls.length >= 2, "walmart needs jsDelivr + local fallback");
  assert.ok(!urls.includes("https://cdn.simpleicons.org/walmart"), "SI CDN 404 skipped");
  assert.ok(
    urls[0]?.includes("cdn.jsdelivr.net/npm/simple-icons@11.14.0/icons/walmart"),
    "jsDelivr first for walmart",
  );
  assert.ok(urls.includes("/logos/marquee/walmart.svg"), "local colored SVG last hop");
  assert.equal(companyInitials("Walmart"), "WA");
}

function testSlugVectorUrlsOrder() {
  assert.deepEqual(slugVectorUrls("target"), [
    "https://cdn.simpleicons.org/target",
    "https://cdn.jsdelivr.net/npm/simple-icons@11.14.0/icons/target.svg",
    "/logos/marquee/target.svg",
  ]);
  assert.deepEqual(slugVectorUrls("walmart"), [
    "https://cdn.jsdelivr.net/npm/simple-icons@11.14.0/icons/walmart.svg",
    "/logos/marquee/walmart.svg",
  ]);
}

function testEveryMarqueeBrandHasLogoOrInitialsFallback() {
  const blocks = parseMarqueeBrands();
  for (const { name, domain } of blocks) {
    const urls = brandLogoUrls({ slug: "x", name, domain });
    const initials = companyInitials(name);
    assert.ok(initials.length > 0 && initials !== "?", `initials: ${name}`);
    if (shouldUseInitialsOnlyLogo(domain)) {
      assert.equal(urls.length, 0, `initials-only domain: ${domain}`);
      continue;
    }
    if (MARQUEE_BRAND_LOGO_MAP[domain]) {
      assert.ok(urls.length > 0, `mapped domain needs logo URLs: ${domain}`);
      assertAllowedLogoUrls(urls, domain);
    }
  }
}

function testWellsFargoUsesStableSiWhenPresent() {
  if (!isStableMarqueeSiSlug("wellsfargo")) return;
  const urls = brandLogoUrls({
    slug: "wellsfargo",
    name: "Wells Fargo",
    domain: "wellsfargo.com",
  });
  assert.ok(urls.length > 0);
  assertAllowedLogoUrls(urls, "wellsfargo");
}

function testAllowlistedStableGetsSiOnly() {
  const brand: Brand = { slug: "apple", name: "Apple", domain: "apple.com" };
  const urls = brandLogoUrls(brand);
  assert.ok(urls.length > 0);
  assert.ok(isStableMarqueeSiSlug("apple"));
  assert.ok(urls.some((u) => u === "https://cdn.simpleicons.org/apple"));
  assert.ok(urls.some((u) => u.includes("cdn.jsdelivr.net")));
  assertNoForcedBlackLogoUrls(urls, "apple");
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

function testPhantomSlugsNotInStableAllowlist() {
  for (const phantom of [
    "jpmorgan",
    "jpmorganchase",
    "citi",
    "citibank",
    "capitalone",
    "deere",
    "ge",
    "jnj",
    "morganstanley",
    "pepsi",
    "pfizer",
    "lowes",
    "unitedparcelsservice",
  ]) {
    assert.ok(
      !MARQUEE_STABLE_SI_SLUGS.has(phantom),
      `phantom slug must not be allowlisted: ${phantom}`,
    );
  }
}

function testBrandLogoUrlsSourceHasNoRasterHelpers() {
  const src = readFileSync(join(root, "src/lib/brand-logo-urls.ts"), "utf8");
  assert.doesNotMatch(src, /function\s+googleFaviconUrl/);
  assert.doesNotMatch(src, /function\s+duckduckgoIconUrl/);
  assert.doesNotMatch(src, /siUrlOnWhite/);
  assert.doesNotMatch(src, /simpleicons\.org\/\$\{slug\}\/000000/);
  assert.doesNotMatch(src, RASTER_FAVICON_RE);
}

function testSafeLogoRendersInitialsLayer() {
  const safe = readFileSync(
    join(root, "src/components/marketing/safe-company-logo.tsx"),
    "utf8",
  );
  assert.match(safe, /companyInitials\(name\)/);
  assert.match(safe, /INITIALS_CLASS/);
  assert.match(safe, /showInitials \? "opacity-100" : "opacity-0/);
  assert.match(safe, /showImg && src/);
  assert.match(safe, /setErrorAtStep\(step\)/);
  assert.match(safe, /errorAtStep === step/);
  assert.match(safe, /key=\{src\}/);
  assert.doesNotMatch(safe, /\bonLoad=/);
  assert.doesNotMatch(safe, /setLoaded/);
}

function testLocalMarqueeLogoFilesExist() {
  for (const slug of MARQUEE_LOCAL_LOGO_SLUGS) {
    assert.ok(isMarqueeLocalLogoSlug(slug));
    const path = join(root, "public", "logos", "marquee", `${slug}.svg`);
    const svg = readFileSync(path, "utf8");
    assert.ok(svg.includes("<svg"), `local marquee svg: ${slug}`);
    assert.equal(localMarqueeLogoUrl(slug), `/logos/marquee/${slug}.svg`);
  }
}

function testLocalMarqueeSlugsSubsetOfStable() {
  for (const slug of MARQUEE_LOCAL_LOGO_SLUGS) {
    assert.ok(isStableMarqueeSiSlug(slug), `local slug must be stable: ${slug}`);
  }
}

function testNoBannedLogoUrlPatterns() {
  const src = readFileSync(join(root, "src/lib/brand-logo-urls.ts"), "utf8");
  assert.doesNotMatch(src, /\/_next\/image/);
  const marquee = readFileSync(
    join(root, "src/components/marketing/company-logo-marquee.tsx"),
    "utf8",
  );
  assert.doesNotMatch(marquee, /\/_next\/image/);
}

function testAllMarqueeBrandsHaveNonEmptyInitials() {
  const blocks = parseMarqueeBrands();
  for (const { name } of blocks) {
    const initials = companyInitials(name);
    assert.ok(initials.length > 0, `initials for ${name}`);
    assert.notEqual(initials, "?", `meaningful initials for ${name}`);
  }
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
  assert.doesNotMatch(marquee, /href=\{`https:\/\//);
  assert.doesNotMatch(marquee, /target="_blank"/);
  assert.match(safe, /<img/);
  assert.doesNotMatch(safe, /from\s+["']next\/image["']/);
}

function testAllMarqueeBrandsAvoidRasterUrls() {
  const blocks = parseMarqueeBrands();
  assert.ok(blocks.length >= 80, "expected Fortune-500 marquee brands");
  for (const { slug, name, domain } of blocks) {
    const urls = brandLogoUrls({ slug, name, domain });
    assertNoRasterFaviconUrls(urls, `${slug}/${domain}`);
  }
}

function testMarqueeFiltersInitialsFallback() {
  const marquee = readFileSync(
    join(root, "src/components/marketing/company-logo-marquee.tsx"),
    "utf8",
  );
  assert.match(marquee, /MARQUEE_BRAND_ENTRIES/);
  assert.match(marquee, /getPublicMarqueeLogos/);
}

function main() {
  testCompanyInitials();
  testAdvanceLogoFallbackStep();
  testBrandLogoUrlsOrder();
  testAllowlistedStableGetsSiOnly();
  testUncertainDomainsNoRasterFavicons();
  testBlocklistedDomainsInitialsOnly();
  testInitialsOnlyDomainsExcludedFromStableSlugs();
  testBrandLogoUrlsSourceHasNoRasterHelpers();
  testSafeLogoRendersInitialsLayer();
  testNoBannedLogoUrlPatterns();
  testAllMarqueeBrandsHaveNonEmptyInitials();
  testMarqueeUsesSafeLogoNotNextImage();
  testAllMarqueeBrandsAvoidRasterUrls();
  testMarqueeStableLogoCoverage();
  testWellsFargoUsesStableSiWhenPresent();
  testPhantomSlugsNotInStableAllowlist();
  testMarqueeBrandLogoMapKeys();
  testVerifiedFixtureMatchesAllowlist();
  testSmokeBrandsProduceUrlsWhenMapped();
  testFounderScreenshotBrandsPreferColoredSiFirst();
  testWalmartSkipsBrokenSiCdnAndHasFallbacks();
  testSlugVectorUrlsOrder();
  testEveryMarqueeBrandHasLogoOrInitialsFallback();
  testLocalMarqueeSlugsSubsetOfStable();
  testLocalMarqueeLogoFilesExist();
  testMarqueeFiltersInitialsFallback();
  console.log("safe-company-logo.test.ts: OK");
}

main();
