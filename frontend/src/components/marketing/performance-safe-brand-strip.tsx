"use client";

import { useTranslation } from "@/components/language-provider";
import { SafeCompanyLogo } from "@/components/marketing/safe-company-logo";
import type { TranslationKey } from "@/lib/i18n";
import { brandLogoUrls, type Brand } from "@/lib/brand-logo-urls";

/** Minimal static strip for workspace/auth — no animation, blur, or huge logo arrays. */
const LIGHT_BRANDS: Brand[] = [
  { slug: "google", name: "Google", domain: "google.com" },
  { slug: "microsoft", name: "Microsoft", domain: "microsoft.com" },
  { slug: "amazon", name: "Amazon", domain: "amazon.com" },
  { slug: "apple", name: "Apple", domain: "apple.com" },
  { slug: "meta", name: "Meta", domain: "meta.com" },
  { slug: "nvidia", name: "NVIDIA", domain: "nvidia.com" },
];

const MARK_BOX_CLASS = "h-8 w-[5.5rem] sm:h-9 sm:w-[6rem]";
const MARK_PLATE_CLASS =
  "border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/[0.04] dark:border-zinc-500/40 dark:bg-zinc-100 dark:ring-white/10";

export function PerformanceSafeBrandStrip() {
  const { t } = useTranslation();
  const linkSuffixKey: TranslationKey = "site.marqueeBrandLinkSuffix";
  const linkSuffix = t(linkSuffixKey);

  return (
    <div
      className="performance-safe-brand-strip shrink-0 border-y border-[var(--twin-border)] bg-[var(--twin-surface)] py-2.5 sm:py-3"
      role="presentation"
      data-testid="performance-safe-brand-strip"
    >
      <div className="flex items-center justify-center gap-3 overflow-x-auto px-3 sm:gap-4 sm:px-5">
        {LIGHT_BRANDS.map((brand) => {
          const a11y = `${brand.name}${linkSuffix}`;
          const urls = brandLogoUrls(brand);
          return (
            <span
              key={brand.slug}
              role="img"
              aria-label={a11y}
              title={a11y}
              className={`${MARK_BOX_CLASS} ${MARK_PLATE_CLASS} relative flex shrink-0 items-center justify-center rounded-lg`}
            >
              <span className="relative flex h-full w-full items-center justify-center px-1.5 py-1">
                <SafeCompanyLogo name={brand.name} urls={urls} loading="lazy" />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
