"use client";

import type { ReactNode } from "react";

import { AnalyticsInit } from "@/components/analytics-init";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { CookieConsentProvider } from "@/components/cookie-consent-provider";
import { DocumentTitleSync } from "@/components/document-title-sync";
import { LanguageProvider } from "@/components/language-provider";
import { MarketingSurfaceSync } from "@/components/marketing-surface-sync";
import { PersonaProvider } from "@/components/persona-provider";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <CookieConsentProvider>
        <PersonaProvider>
          <DocumentTitleSync />
          <MarketingSurfaceSync />
          <AnalyticsInit />
          <CookieConsentBanner />
          <Toaster position="top-right" />
          {children}
        </PersonaProvider>
      </CookieConsentProvider>
    </LanguageProvider>
  );
}
