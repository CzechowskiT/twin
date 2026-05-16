import type { ReactNode } from "react";

/**
 * Public marketing routes. Visual mode is toggled in `src/lib/marketing-surface.ts`
 * (`MARKETING_SURFACE`: `heritage` | `studio`).
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>;
}
