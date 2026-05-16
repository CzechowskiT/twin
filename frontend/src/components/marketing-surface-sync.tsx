"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { isMarketingPath, MARKETING_SURFACE } from "@/lib/marketing-surface";

const ATTR = "data-marketing-surface";

/** Applies studio tokens on <html> for marketing routes only (see `marketing-surface.ts` to switch back). */
export function MarketingSurfaceSync() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    const root = document.documentElement;
    const studioHere = isMarketingPath(pathname) && MARKETING_SURFACE === "studio";
    if (studioHere) {
      root.setAttribute(ATTR, "studio");
    } else {
      root.removeAttribute(ATTR);
    }
    return () => root.removeAttribute(ATTR);
  }, [pathname]);

  return null;
}
