import type { ReactNode } from "react";

import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

/**
 * Public marketing routes. Visual mode is toggled in `src/lib/marketing-surface.ts`
 * (`MARKETING_SURFACE`: `heritage` | `studio`).
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingPageShell>{children}</MarketingPageShell>;
}
