"use client";

import { SiteHeaderBar } from "@/components/site-header-bar";

/** Authenticated app chrome — read-only persona badge when a session exists. */
export function AppHeader() {
  return <SiteHeaderBar showPersonaBadge showPersonaSwitcher={false} />;
}
