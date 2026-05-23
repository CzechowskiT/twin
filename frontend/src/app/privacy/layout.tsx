import type { ReactNode } from "react";

import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return <MarketingPageShell>{children}</MarketingPageShell>;
}
