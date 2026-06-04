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

export function siUrl(slug: string) {
  return `https://cdn.simpleicons.org/${slug}`;
}

export function jsdelivrSiUrl(slug: string) {
  return `https://cdn.jsdelivr.net/npm/simple-icons@${SIMPLE_ICONS_JSdelivr}/icons/${slug}.svg`;
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

export function isStableMarqueeSiSlug(slug: string): boolean {
  return MARQUEE_STABLE_SI_SLUGS.has(slug.trim().toLowerCase());
}

/** SI vectors and verified `extraUrls` only — no Google/gstatic or DuckDuckGo raster. */
export function brandLogoUrls(brand: Brand): string[] {
  if (shouldUseInitialsOnlyLogo(brand.domain)) {
    return [];
  }
  const slugs = [...new Set([brand.slug, ...(brand.altSlugs ?? [])])];
  const stableSlugs = slugs.filter(isStableMarqueeSiSlug);
  const custom = brand.extraUrls ?? [];
  if (stableSlugs.length === 0 && custom.length === 0) {
    return [];
  }
  const vector = stableSlugs.flatMap((slug) => [jsdelivrSiUrl(slug), siUrl(slug)]);
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
