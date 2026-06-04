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

/** @deprecated Marquee no longer uses Google favicon (gstatic faviconV2 404 noise). */
export function googleFaviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

/** @deprecated Marquee no longer uses DuckDuckGo ip3 (predictable 404 on several domains). */
export function duckduckgoIconUrl(domain: string) {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
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
 * Simple Icons slugs verified for the Fortune-500 marquee (primary + alt).
 * No Google/gstatic or DuckDuckGo raster hops — SI vectors and `extraUrls` only.
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
  "capitalone",
  "caterpillar",
  "chase",
  "cisco",
  "citi",
  "citibank",
  "cocacola",
  "comcast",
  "costco",
  "deere",
  "delta",
  "deloitte",
  "disney",
  "ey",
  "exxonmobil",
  "fedex",
  "ford",
  "generalelectric",
  "generalmotors",
  "ge",
  "goldmansachs",
  "google",
  "honda",
  "ibm",
  "intel",
  "intuit",
  "jnj",
  "johnsonandjohnson",
  "jpmorgan",
  "jpmorganchase",
  "kpmg",
  "lockheedmartin",
  "lowes",
  "mastercard",
  "mcdonalds",
  "mercedes",
  "merck",
  "meta",
  "metlife",
  "microsoft",
  "moderna",
  "morganstanley",
  "nestle",
  "netflix",
  "nike",
  "northropgrumman",
  "novartis",
  "nvidia",
  "oracle",
  "paypal",
  "pepsi",
  "pfizer",
  "philips",
  "pwc",
  "rtx",
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
  "unitedhealthcare",
  "unitedhealthgroup",
  "unitedparcelsservice",
  "ups",
  "verizon",
  "visa",
  "volkswagen",
  "walgreens",
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

/** Two-letter plate label when every remote logo URL fails. */
export function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return `${a}${b}`.toUpperCase() || "?";
  }
  const word = parts[0] ?? "?";
  return word.slice(0, 2).toUpperCase();
}

/** Advance fallback index; `null` means show initials (no more URLs to try). */
export function advanceLogoFallbackStep(current: number, urlCount: number): number | null {
  if (urlCount <= 0) return null;
  const next = current + 1;
  return next < urlCount ? next : null;
}
