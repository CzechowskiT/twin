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

export function googleFaviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function duckduckgoIconUrl(domain: string) {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

/** Color-first: site/raster favicons before monochrome Simple Icons SVGs. */
export function brandLogoUrls(brand: Brand): string[] {
  const slugs = [...new Set([brand.slug, ...(brand.altSlugs ?? [])])];
  const raster = [duckduckgoIconUrl(brand.domain), googleFaviconUrl(brand.domain)];
  const custom = brand.extraUrls ?? [];
  const vector = slugs.flatMap((slug) => [jsdelivrSiUrl(slug), siUrl(slug)]);
  return [...custom, ...raster, ...vector];
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
