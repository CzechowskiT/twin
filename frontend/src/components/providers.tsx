"use client";

import type { ReactNode } from "react";

import { DocumentTitleSync } from "@/components/document-title-sync";
import { LanguageProvider } from "@/components/language-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <DocumentTitleSync />
      {children}
    </LanguageProvider>
  );
}
