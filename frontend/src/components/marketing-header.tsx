"use client";

import { SiteHeaderBar } from "@/components/site-header-bar";

/** Public marketing chrome — no persona dropdown on the landing experience. */
export function MarketingHeader() {
  return <SiteHeaderBar showPersonaBadge={false} />;
}
