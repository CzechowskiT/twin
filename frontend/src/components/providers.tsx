"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "@/components/language-provider";

export function Providers({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
