"use client";

import { useEffect, useState } from "react";

export function AnimatedCounter({
  value,
  durationMs = 1200,
  locale = "en-US",
}: {
  value: number;
  durationMs?: number;
  locale?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(Math.round(value * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <>{display.toLocaleString(locale)}</>;
}
