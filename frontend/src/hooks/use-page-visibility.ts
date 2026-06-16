"use client";

import { useEffect, useState } from "react";

/** Tracks `document.visibilityState` — hidden tabs should pause timers and animations. */
export function usePageVisibility(): { hidden: boolean; visible: boolean } {
  const [hidden, setHidden] = useState(() =>
    typeof document !== "undefined" ? document.hidden : false,
  );

  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    onChange();
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return { hidden, visible: !hidden };
}
