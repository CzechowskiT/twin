"use client";

import type { ReactNode } from "react";

import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { DocumentTitleSync } from "@/components/document-title-sync";
import { LanguageProvider } from "@/components/language-provider";
import { MarketingSurfaceSync } from "@/components/marketing-surface-sync";
import { PersonaProvider } from "@/components/persona-provider";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <PersonaProvider>
        <DocumentTitleSync />
        <MarketingSurfaceSync />
        <CookieConsentBanner />
        <Toaster position="top-right" />
        {children}
      </PersonaProvider>
    </LanguageProvider>
  );
}
