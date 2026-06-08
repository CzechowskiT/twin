"use client";

import { SiteHeaderBar } from "@/components/site-header-bar";

/** Public marketing chrome — flat persona lanes + login before sign-in. */
export function MarketingHeader() {
  return <SiteHeaderBar showMarketingPersonaNav showPersonaBadge={false} />;
}
