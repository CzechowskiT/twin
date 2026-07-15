/** Shared partner / brand logo plate sizing for marketing marquees. */
import type { CSSProperties } from "react";

export const PARTNER_LOGO_CARD_CLASS = "partner-logo-card partner-logo";

/** Subtle plate — legible on dark studio rails without heavy white button chrome. */
export const PARTNER_LOGO_PLATE_CLASS =
  "border border-zinc-200/50 bg-white/95 dark:border-zinc-500/25 dark:bg-zinc-900/45";

export const PARTNER_LOGO_ROW_GAP_CLASS = "gap-x-3 pe-3 sm:gap-x-5 sm:pe-5";

/** Shared vertical padding for marketing + workspace marquee shells. */
export const PARTNER_LOGO_MARQUEE_BAND_CLASS =
  "shrink-0 border-y border-[var(--twin-border)] bg-[var(--twin-surface)]/90 py-2 sm:py-2.5";

/**
 * Per-slug optical height multipliers — preserves aspect ratio (transform scale only).
 * Targets wordmarks that read smaller than peers inside the shared img band.
 */
export const PARTNER_LOGO_OPTICAL_SCALE_OVERRIDES: Readonly<Record<string, number>> = {
  walmart: 1.18,
  goldmansachs: 1.1,
  wellsfargo: 1.12,
  americanexpress: 1.08,
};

export function partnerLogoOpticalScale(slug: string): number {
  return PARTNER_LOGO_OPTICAL_SCALE_OVERRIDES[slug.trim().toLowerCase()] ?? 1;
}

export function partnerLogoOpticalStyle(slug: string): CSSProperties | undefined {
  const scale = partnerLogoOpticalScale(slug);
  if (scale === 1) return undefined;
  return { "--partner-logo-optical-scale": String(scale) } as CSSProperties;
}

export function partnerLogoOpticalDataAttrs(slug: string): Record<string, string> | undefined {
  const scale = partnerLogoOpticalScale(slug);
  if (scale === 1) return undefined;
  return { "data-optical-scale": String(scale) };
}
