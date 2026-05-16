"use client";

import type { ReactNode } from "react";

import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { GdprRouteGuard } from "@/components/gdpr-route-guard";
import { DocumentTitleSync } from "@/components/document-title-sync";
import { LanguageProvider } from "@/components/language-provider";
import { MarketingSurfaceSync } from "@/components/marketing-surface-sync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <DocumentTitleSync />
      <MarketingSurfaceSync />
      <CookieConsentBanner />
      <GdprRouteGuard />
      {children}
    </LanguageProvider>
  );
}
