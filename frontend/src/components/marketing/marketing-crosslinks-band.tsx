"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import {
  FOUNDER_DEMO_CROSSLINKS_BY_PAGE,
  type FounderDemoCrosslinkPage,
} from "@/lib/founder-demo-crosslinks-routes";

type MarketingCrosslinksBandProps = {
  page: FounderDemoCrosslinkPage;
  className?: string;
};

/** Compact related-route band — bounded copy, honest public surfaces only. */
export function MarketingCrosslinksBand({ page, className = "" }: MarketingCrosslinksBandProps) {
  const { t } = useTranslation();
  const links = FOUNDER_DEMO_CROSSLINKS_BY_PAGE[page];

  return (
    <nav
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-sm ${className}`.trim()}
      aria-label={t("marketingCrosslinks.ariaLabel")}
      data-founder-demo-crosslinks={page}
    >
      <span className="w-full shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--twin-muted)] sm:w-auto">
        {t("marketingCrosslinks.heading")}
      </span>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="twin-link font-medium">
          {t(link.labelKey)}
        </Link>
      ))}
    </nav>
  );
}
