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
    <div
      className={`-mx-4 min-w-0 overflow-x-hidden sm:-mx-6 ${className}`.trim()}
      data-founder-demo-crosslinks={page}
    >
      <nav
        className="mx-auto max-w-6xl px-4 sm:px-6"
        aria-label={t("marketingCrosslinks.ariaLabel")}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--twin-muted)]">
          {t("marketingCrosslinks.heading")}
        </p>
        <ul className="mt-2 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <li key={link.href} className="min-w-0 list-none">
              <Link
                href={link.href}
                className="twin-touch-target twin-link block min-w-0 break-words rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-[var(--twin-accent-muted)]/25"
              >
                {t(link.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
