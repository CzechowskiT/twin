"use client";

import type { ReactNode } from "react";

import { LandingAmbient } from "@/components/marketing/landing-ambient";

/**
 * Shared dark marketing chrome: mesh, grain, and mint orbs (same as homepage).
 * Used by `(marketing)` layout and public auth/legal routes.
 */
export function MarketingPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-journey-host relative z-0 flex flex-1 flex-col">
      <LandingAmbient />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
