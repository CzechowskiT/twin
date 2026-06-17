"use client";

import { useMemo, type CSSProperties } from "react";

import { useTranslation } from "@/components/language-provider";
import { SafeCompanyLogo } from "@/components/marketing/safe-company-logo";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";
import type { Brand } from "@/lib/brand-logo-urls";
import {
  PERFORMANCE_SAFE_MARQUEE_BRANDS,
  PERFORMANCE_SAFE_MARQUEE_SEGMENTS,
} from "@/lib/marquee-brand-subset";
import type { TranslationKey } from "@/lib/i18n";
import { performanceSafeCuratedLogoUrls } from "@/lib/performance-safe-curated-logos";

const MARK_BOX_CLASS = "h-9 w-[7.25rem] sm:h-10 sm:w-[8rem]";

const MARK_PLATE_CLASS =
  "border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/[0.04] dark:border-zinc-500/40 dark:bg-zinc-100 dark:ring-white/10";

function BrandMark({
  brand,
  linkSuffix,
  tabIndex,
}: {
  brand: Brand;
  linkSuffix: string;
  tabIndex?: number;
}) {
  const urls = useMemo(() => performanceSafeCuratedLogoUrls(brand.slug), [brand.slug]);
  const a11y = `${brand.name}${linkSuffix}`;
  const plateClass = `${MARK_BOX_CLASS} ${MARK_PLATE_CLASS} relative flex shrink-0 items-center justify-center rounded-lg`;

  return (
    <span role="img" tabIndex={tabIndex} aria-label={a11y} title={a11y} className={plateClass}>
      <span className="relative flex h-full w-full items-center justify-center px-1.5 py-1 sm:px-2">
        <SafeCompanyLogo name={brand.name} urls={urls} loading="lazy" />
      </span>
    </span>
  );
}

function LogoRow({
  segmentIndex,
  ariaHidden,
  linkSuffixKey,
}: {
  segmentIndex: number;
  ariaHidden?: boolean;
  linkSuffixKey: TranslationKey;
}) {
  const { t } = useTranslation();
  const linkSuffix = t(linkSuffixKey);
  return (
    <div
      className="performance-safe-marquee-segment inline-flex shrink-0 items-center gap-x-4 sm:gap-x-5"
      aria-hidden={ariaHidden}
    >
      {PERFORMANCE_SAFE_MARQUEE_BRANDS.map((brand) => (
        <BrandMark
          key={`${segmentIndex}-${brand.slug}`}
          brand={brand}
          linkSuffix={linkSuffix}
          tabIndex={ariaHidden ? -1 : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Bounded DOM marquee for workspace/auth — ≤27 logo nodes (9×3 segments),
 * self-hosted curated wordmarks only, CSS transform loop; pauses when tab
 * hidden or motion reduced.
 */
export function PerformanceSafeMovingLogoMarquee() {
  const reducedMotion = useReducedMotionPreference();
  const { hidden } = usePageVisibility();
  const linkSuffixKey: TranslationKey = "site.marqueeBrandLinkSuffix";
  const staticMarquee = reducedMotion || hidden;

  if (staticMarquee) {
    return (
      <div
        className="performance-safe-logo-marquee shrink-0 border-y border-[var(--twin-border)] bg-[var(--twin-surface)]/90 py-3.5 sm:py-4"
        role="presentation"
      >
        <div className="performance-safe-logo-marquee__viewport overflow-x-auto [-webkit-overflow-scrolling:touch] px-3 sm:px-5">
          <div className="flex w-max items-center py-1">
            <LogoRow segmentIndex={0} ariaHidden={false} linkSuffixKey={linkSuffixKey} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="performance-safe-logo-marquee shrink-0 border-y border-[var(--twin-border)] bg-[var(--twin-surface)]/90 py-3.5 sm:py-4"
      role="presentation"
    >
      <div className="performance-safe-logo-marquee__viewport overflow-x-clip px-3 sm:px-5" aria-hidden>
        <div
          className="performance-safe-marquee-track flex w-max items-center py-0.5"
          style={
            {
              "--performance-safe-marquee-segments": PERFORMANCE_SAFE_MARQUEE_SEGMENTS,
            } as CSSProperties
          }
        >
          {Array.from({ length: PERFORMANCE_SAFE_MARQUEE_SEGMENTS }, (_, segmentIndex) => (
            <LogoRow
              key={segmentIndex}
              segmentIndex={segmentIndex}
              ariaHidden={segmentIndex > 0}
              linkSuffixKey={linkSuffixKey}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
