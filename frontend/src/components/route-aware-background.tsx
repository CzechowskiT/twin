"use client";

import { usePathname } from "next/navigation";

import { NatureBackground, resolveNatureVariant } from "@/components/nature-background";
import { isMarketingPublicPath } from "@/lib/marketing-public-paths";
import { MARKETING_SURFACE } from "@/lib/marketing-surface";

/** Full-app studio glow when enabled; otherwise route-specific nature wallpaper (heritage). */
export function RouteAwareBackground() {
  const pathname = usePathname() ?? "/";
  if (MARKETING_SURFACE === "studio") {
    if (isMarketingPublicPath(pathname)) return null;
    return <div className="twin-bg-root twin-studio-ambient" aria-hidden />;
  }
  const variant = resolveNatureVariant(pathname);
  return <NatureBackground variant={variant} />;
}
