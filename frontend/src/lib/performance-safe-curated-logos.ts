/**
 * Self-hosted, verified wordmarks for the performance-safe marquee subset.
 * Workspace/auth uses ONLY these paths — no Simple Icons CDN (wrong glyphs / blobs).
 */
export const PERFORMANCE_SAFE_CURATED_LOGO_SLUGS = [
  "apple",
  "microsoft",
  "google",
  "amazon",
  "nvidia",
  "meta",
  "visa",
  "salesforce",
  "netflix",
] as const;

export type PerformanceSafeCuratedLogoSlug = (typeof PERFORMANCE_SAFE_CURATED_LOGO_SLUGS)[number];

const CURATED_SLUG_SET = new Set<string>(PERFORMANCE_SAFE_CURATED_LOGO_SLUGS);

export function isPerformanceSafeCuratedLogoSlug(slug: string): slug is PerformanceSafeCuratedLogoSlug {
  return CURATED_SLUG_SET.has(slug.trim().toLowerCase());
}

export function performanceSafeCuratedLogoUrl(slug: string): string {
  return `/logos/marquee-curated/${slug.trim().toLowerCase()}.svg`;
}

/** Single local URL — no remote fallback chain on light chrome. */
export function performanceSafeCuratedLogoUrls(slug: string): string[] {
  if (!isPerformanceSafeCuratedLogoSlug(slug)) {
    return [];
  }
  return [performanceSafeCuratedLogoUrl(slug)];
}
