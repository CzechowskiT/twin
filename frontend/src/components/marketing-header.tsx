"use client";

import { SiteHeaderBar } from "@/components/site-header-bar";

/** Public marketing chrome — persona lane picker before sign-in. */
export function MarketingHeader() {
  return <SiteHeaderBar showPersonaSwitcher showPersonaBadge={false} />;
}
