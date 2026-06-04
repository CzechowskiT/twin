/** Corporate domain for favicon fallbacks when Simple Icons slug fails. */
export type Brand = {
  slug: string;
  name: string;
  domain: string;
  /** Extra Simple Icons slug attempts before leaving SI CDN. */
  altSlugs?: string[];
  /** Known-good raster URLs when SI / favicon CDNs miss (e.g. Capital One). */
  extraUrls?: string[];
};

/** Pinned release — `@16` path 404s on jsDelivr and broke the second fallback for most marks. */
const SIMPLE_ICONS_JSdelivr = "11.14.0";

/**
 * Marquee stable key (domain) → verified Simple Icons slug at `simple-icons@11.14.0`.
 * Checked before `brand.slug` so marquee rows can keep readable slugs (e.g. `citi`) while
 * only verified slugs hit the CDN.
 */
export const MARQUEE_BRAND_LOGO_MAP: Record<string, string> = {
  "aa.com": "americanairlines",
  "abbvie.com": "abbvie",
  "accenture.com": "accenture",
  "adidas.com": "adidas",
  "adobe.com": "adobe",
  "amazon.com": "amazon",
  "americanexpress.com": "americanexpress",
  "amd.com": "amd",
  "apple.com": "apple",
  "att.com": "atandt",
  "bankofamerica.com": "bankofamerica",
  "bmw.com": "bmw",
  "boeing.com": "boeing",
  "broadcom.com": "broadcom",
  "caterpillar.com": "caterpillar",
  "cisco.com": "cisco",
  "coca-cola.com": "cocacola",
  "deere.com": "johndeere",
  "delta.com": "delta",
  "fedex.com": "fedex",
  "ford.com": "ford",
  "ge.com": "generalelectric",
  "gm.com": "generalmotors",
  "goldmansachs.com": "goldmansachs",
  "google.com": "google",
  "honda.com": "honda",
  "ibm.com": "ibm",
  "intel.com": "intel",
  "intuit.com": "intuit",
  "jpmorganchase.com": "chase",
  "mastercard.com": "mastercard",
  "mcdonalds.com": "mcdonalds",
  "mercedes-benz.com": "mercedes",
  "meta.com": "meta",
  "microsoft.com": "microsoft",
  "netflix.com": "netflix",
  "nike.com": "nike",
  "nvidia.com": "nvidia",
  "oracle.com": "oracle",
  "paypal.com": "paypal",
  "salesforce.com": "salesforce",
  "samsung.com": "samsung",
  "shell.com": "shell",
  "siemens.com": "siemens",
  "starbucks.com": "starbucks",
  "target.com": "target",
  "tesla.com": "tesla",
  "t-mobile.com": "tmobile",
  "toyota.com": "toyota",
  "uber.com": "uber",
  "unilever.com": "unilever",
  "united.com": "unitedairlines",
  "ups.com": "ups",
  "verizon.com": "verizon",
  "visa.com": "visa",
  "volkswagen.com": "volkswagen",
  "walmart.com": "walmart",
  "wellsfargo.com": "wellsfargo",
};

/** Official Simple Icons brand color (no `/hex` suffix). */
export function siUrl(slug: string) {
  return `https://cdn.simpleicons.org/${slug}`;
}

export function jsdelivrSiUrl(slug: string) {
  return `https://cdn.jsdelivr.net/npm/simple-icons@${SIMPLE_ICONS_JSdelivr}/icons/${slug}.svg`;
}

/** Self-hosted SI copies (colored exports only — not used until filled with brand hex). */
export const MARQUEE_LOCAL_LOGO_SLUGS = new Set([
  "adidas",
  "amazon",
  "americanexpress",
  "apple",
  "bankofamerica",
  "chase",
  "goldmansachs",
  "google",
  "mastercard",
  "microsoft",
  "nike",
  "shell",
  "starbucks",
  "target",
  "walmart",
  "wellsfargo",
]);

export function localMarqueeLogoUrl(slug: string) {
  return `/logos/marquee/${slug.trim().toLowerCase()}.svg`;
}

export function isMarqueeLocalLogoSlug(slug: string): boolean {
  return MARQUEE_LOCAL_LOGO_SLUGS.has(slug.trim().toLowerCase());
}

/**
 * DuckDuckGo ip3 favicons 404 predictably for these domains (founder smoke 2026-06-03).
 * Skip remote fetch — marquee shows initials only (no Console 404 noise).
 */
export const FAVICON_INITIALS_ONLY_DOMAINS = new Set([
  "homedepot.com",
  "chevron.com",
  "servicenow.com",
  "humana.com",
  "cvs.com",
]);

export function shouldUseInitialsOnlyLogo(domain: string): boolean {
  return FAVICON_INITIALS_ONLY_DOMAINS.has(domain.trim().toLowerCase());
}

/**
 * Simple Icons slugs that exist at pinned `simple-icons@11.14.0` on jsDelivr/CDN.
 * Phantom slugs (e.g. `jpmorgan`, `citi`) 404 and wasted fallback hops → initials plates.
 */
export const MARQUEE_STABLE_SI_SLUGS = new Set([
  "abbvie",
  "accenture",
  "adidas",
  "adobe",
  "amazon",
  "americanairlines",
  "americanexpress",
  "amd",
  "apple",
  "atandt",
  "bankofamerica",
  "bmw",
  "boeing",
  "broadcom",
  "caterpillar",
  "chase",
  "cisco",
  "cocacola",
  "delta",
  "fedex",
  "ford",
  "generalelectric",
  "generalmotors",
  "goldmansachs",
  "google",
  "honda",
  "ibm",
  "intel",
  "intuit",
  "johndeere",
  "mastercard",
  "mcdonalds",
  "mercedes",
  "merck",
  "meta",
  "microsoft",
  "netflix",
  "nike",
  "nvidia",
  "oracle",
  "paypal",
  "salesforce",
  "samsung",
  "shell",
  "siemens",
  "starbucks",
  "target",
  "tesla",
  "tmobile",
  "toyota",
  "uber",
  "unilever",
  "unitedairlines",
  "ups",
  "verizon",
  "visa",
  "volkswagen",
  "walmart",
  "wellsfargo",
]);

/** Fixture: slugs in `MARQUEE_BRAND_LOGO_MAP` values plus `MARQUEE_STABLE_SI_SLUGS` (tests). */
export const MARQUEE_VERIFIED_SI_SLUGS = [
  ...new Set([
    ...Object.values(MARQUEE_BRAND_LOGO_MAP),
    ...MARQUEE_STABLE_SI_SLUGS,
  ]),
].sort();

export function isStableMarqueeSiSlug(slug: string): boolean {
  return MARQUEE_STABLE_SI_SLUGS.has(slug.trim().toLowerCase());
}

/** Resolved SI slugs for a marquee brand — explicit domain map first, then slug / altSlugs. */
export function resolveMarqueeLogoSlugs(brand: Brand): string[] {
  const domain = brand.domain.trim().toLowerCase();
  const mapped = MARQUEE_BRAND_LOGO_MAP[domain];
  const candidates = [
    ...(mapped ? [mapped] : []),
    brand.slug,
    ...(brand.altSlugs ?? []),
  ];
  return [...new Set(candidates.map((s) => s.trim().toLowerCase()))].filter(
    isStableMarqueeSiSlug,
  );
}

/** SI vectors and verified `extraUrls` only — no Google/gstatic or DuckDuckGo raster. */
export function brandLogoUrls(brand: Brand): string[] {
  if (shouldUseInitialsOnlyLogo(brand.domain)) {
    return [];
  }
  const stableSlugs = resolveMarqueeLogoSlugs(brand);
  const custom = brand.extraUrls ?? [];
  if (stableSlugs.length === 0 && custom.length === 0) {
    return [];
  }
  // Brand-colored SI CDN first, then pinned jsDelivr SVG (no forced-black hex suffix).
  const vector = stableSlugs.flatMap((slug) => [siUrl(slug), jsdelivrSiUrl(slug)]);
  return [...custom, ...vector];
}

/** Plate label when remote logos are skipped or every URL fails (never empty). */
export function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return `${a}${b}`.toUpperCase() || "?";
  }
  const word = (parts[0] ?? name.trim()).replace(/[''.]/g, "");
  if (!word) return "?";
  if (word.length <= 3) {
    return word.toUpperCase();
  }
  return word.slice(0, 2).toUpperCase();
}

/** Advance fallback index; `null` means show initials (no more URLs to try). */
export function advanceLogoFallbackStep(current: number, urlCount: number): number | null {
  if (urlCount <= 0) return null;
  const next = current + 1;
  return next < urlCount ? next : null;
}
