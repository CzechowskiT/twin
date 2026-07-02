/**
 * Curated performance-safe marquee logos — inline wordmark metadata only.
 * Workspace/auth uses PerformanceSafeLogoMark (no CDN, no raster packs).
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

export type PerformanceSafeLogoRenderType = "wordmark" | "mark" | "mixed";

export type PerformanceSafeLogoQualityStatus = "verified-curated";

export interface PerformanceSafeCuratedLogoVisualSpec {
  id: PerformanceSafeCuratedLogoSlug;
  displayName: string;
  renderType: PerformanceSafeLogoRenderType;
  brandColor: string;
  opticalScale: number;
  ariaLabel: string;
  qualityStatus: PerformanceSafeLogoQualityStatus;
}

/** Minimum optical scale for readable wordmarks (Salesforce floor). */
export const PERFORMANCE_SAFE_LOGO_READABILITY_MIN_OPTICAL_SCALE = 0.95;

/** NVIDIA must not dominate the strip. */
export const PERFORMANCE_SAFE_LOGO_NVIDIA_DOMINANCE_MAX_OPTICAL_SCALE = 0.92;

/** Apple mark/wordmark cap when icon-heavy. */
export const PERFORMANCE_SAFE_LOGO_APPLE_MARK_MAX_OPTICAL_SCALE = 0.92;

/** Salesforce must stay at or above readability floor. */
export const PERFORMANCE_SAFE_LOGO_SALESFORCE_MIN_OPTICAL_SCALE = 0.98;

const CURATED_SLUG_SET = new Set<string>(PERFORMANCE_SAFE_CURATED_LOGO_SLUGS);

export const PERFORMANCE_SAFE_CURATED_LOGO_VISUALS: Record<
  PerformanceSafeCuratedLogoSlug,
  PerformanceSafeCuratedLogoVisualSpec
> = {
  apple: {
    id: "apple",
    displayName: "Apple",
    renderType: "wordmark",
    brandColor: "#1d1d1f",
    opticalScale: 0.92,
    ariaLabel: "Apple",
    qualityStatus: "verified-curated",
  },
  microsoft: {
    id: "microsoft",
    displayName: "Microsoft",
    renderType: "mixed",
    brandColor: "#5e5e5e",
    opticalScale: 0.98,
    ariaLabel: "Microsoft",
    qualityStatus: "verified-curated",
  },
  google: {
    id: "google",
    displayName: "Google",
    renderType: "wordmark",
    brandColor: "#4285F4",
    opticalScale: 0.98,
    ariaLabel: "Google",
    qualityStatus: "verified-curated",
  },
  amazon: {
    id: "amazon",
    displayName: "Amazon",
    renderType: "wordmark",
    brandColor: "#232f3e",
    opticalScale: 0.98,
    ariaLabel: "Amazon",
    qualityStatus: "verified-curated",
  },
  nvidia: {
    id: "nvidia",
    displayName: "NVIDIA",
    renderType: "wordmark",
    brandColor: "#76b900",
    opticalScale: 0.92,
    ariaLabel: "NVIDIA",
    qualityStatus: "verified-curated",
  },
  meta: {
    id: "meta",
    displayName: "Meta",
    renderType: "wordmark",
    brandColor: "#0467df",
    opticalScale: 0.98,
    ariaLabel: "Meta",
    qualityStatus: "verified-curated",
  },
  visa: {
    id: "visa",
    displayName: "Visa",
    renderType: "wordmark",
    brandColor: "#1434cb",
    opticalScale: 0.98,
    ariaLabel: "Visa",
    qualityStatus: "verified-curated",
  },
  salesforce: {
    id: "salesforce",
    displayName: "Salesforce",
    renderType: "wordmark",
    brandColor: "#00a1e0",
    opticalScale: 1,
    ariaLabel: "Salesforce",
    qualityStatus: "verified-curated",
  },
  netflix: {
    id: "netflix",
    displayName: "Netflix",
    renderType: "wordmark",
    brandColor: "#e50914",
    opticalScale: 0.98,
    ariaLabel: "Netflix",
    qualityStatus: "verified-curated",
  },
};

export function isPerformanceSafeCuratedLogoSlug(slug: string): slug is PerformanceSafeCuratedLogoSlug {
  return CURATED_SLUG_SET.has(slug.trim().toLowerCase());
}

export function getPerformanceSafeCuratedLogoSpec(
  slug: string,
): PerformanceSafeCuratedLogoVisualSpec | null {
  if (!isPerformanceSafeCuratedLogoSlug(slug)) {
    return null;
  }
  return PERFORMANCE_SAFE_CURATED_LOGO_VISUALS[slug];
}

/** @deprecated Inline marks only — kept for marketing parity tests that grep paths. */
export function performanceSafeCuratedLogoUrl(slug: string): string {
  return `/logos/marquee-curated/${slug.trim().toLowerCase()}.svg`;
}

/** @deprecated Safe marquee no longer loads img assets on workspace/auth. */
export function performanceSafeCuratedLogoUrls(slug: string): string[] {
  if (!isPerformanceSafeCuratedLogoSlug(slug)) {
    return [];
  }
  return [];
}
