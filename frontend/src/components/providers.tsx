"use client";

import type { ReactNode } from "react";

import { DocumentTitleSync } from "@/components/document-title-sync";
import { LanguageProvider } from "@/components/language-provider";
import { MarketingSurfaceSync } from "@/components/marketing-surface-sync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <DocumentTitleSync />
      <MarketingSurfaceSync />
      {children}
    </LanguageProvider>
  );
}
