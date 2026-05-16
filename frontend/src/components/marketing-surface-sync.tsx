"use client";

import { useEffect } from "react";

import { MARKETING_SURFACE } from "@/lib/marketing-surface";

const ATTR = "data-marketing-surface";

/** Applies studio design tokens on <html> for the whole app when `MARKETING_SURFACE` is `"studio"`. */
export function MarketingSurfaceSync() {
  useEffect(() => {
    const root = document.documentElement;
    if (MARKETING_SURFACE === "studio") {
      root.setAttribute(ATTR, "studio");
    } else {
      root.removeAttribute(ATTR);
    }
    return () => root.removeAttribute(ATTR);
  }, []);

  return null;
}
