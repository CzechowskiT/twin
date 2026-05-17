"use client";

import { useLayoutEffect } from "react";

import { MARKETING_SURFACE } from "@/lib/marketing-surface";

const ATTR = "data-marketing-surface";

/**
 * Syncs `<html data-marketing-surface>` with `MARKETING_SURFACE` before paint (root layout also sets it for SSR).
 */
export function MarketingSurfaceSync() {
  useLayoutEffect(() => {
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
