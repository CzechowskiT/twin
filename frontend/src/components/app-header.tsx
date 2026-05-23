"use client";

import { SiteHeaderBar } from "@/components/site-header-bar";

/** Authenticated app chrome — persona switcher when a session exists. */
export function AppHeader() {
  return <SiteHeaderBar showPersonaSwitcher />;
}
