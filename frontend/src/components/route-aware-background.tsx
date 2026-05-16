"use client";

import { usePathname } from "next/navigation";

import { NatureBackground, resolveNatureVariant } from "@/components/nature-background";
import { isMarketingPath, MARKETING_SURFACE } from "@/lib/marketing-surface";

/** Route-specific ambient: nature photo (default) or dark studio glow on marketing when enabled in `marketing-surface.ts`. */
export function RouteAwareBackground() {
  const pathname = usePathname() ?? "/";
  if (isMarketingPath(pathname) && MARKETING_SURFACE === "studio") {
    return <div className="twin-bg-root twin-studio-ambient" aria-hidden />;
  }
  const variant = resolveNatureVariant(pathname);
  return <NatureBackground variant={variant} />;
}
