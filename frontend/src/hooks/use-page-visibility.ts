"use client";

import { useEffect, useState } from "react";

/** Tracks `document.visibilityState` — hidden tabs should pause timers and animations. */
export function usePageVisibility(): { hidden: boolean; visible: boolean } {
  // Match server first paint (always visible) — sync real visibility after mount (React #418).
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    onChange();
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return { hidden, visible: !hidden };
}
