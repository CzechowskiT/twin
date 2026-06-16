"use client";

import { useEffect } from "react";

import { usePageVisibility } from "@/hooks/use-page-visibility";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";

/** Sets document-level flags so CSS can pause GPU-heavy chrome in hidden tabs. */
export function PageVisibilitySync() {
  const { hidden } = usePageVisibility();
  const reducedMotion = useReducedMotionPreference();

  useEffect(() => {
    const root = document.documentElement;
    if (hidden) root.setAttribute("data-page-hidden", "true");
    else root.removeAttribute("data-page-hidden");
  }, [hidden]);

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) root.setAttribute("data-reduced-motion", "true");
    else root.removeAttribute("data-reduced-motion");
  }, [reducedMotion]);

  return null;
}
