"use client";

import { useEffect, useState, type ReactNode } from "react";

import { usePageVisibility } from "@/hooks/use-page-visibility";

const SLOW_PAINT_MS = 8_000;

/**
 * Route shell with optional skeleton and paint timeout.
 * Background tabs always render children — hidden-tab throttling must not block first paint forever.
 */
export function LightweightRouteShell({
  children,
  skeleton,
}: {
  children: ReactNode;
  skeleton?: ReactNode;
}) {
  const { hidden } = usePageVisibility();
  const [paintReady, setPaintReady] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (hidden) {
      setPaintReady(true);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPaintReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [hidden]);

  useEffect(() => {
    if (paintReady || hidden) return;
    const timer = window.setTimeout(() => setForceShow(true), SLOW_PAINT_MS);
    return () => window.clearTimeout(timer);
  }, [paintReady, hidden]);

  if (!paintReady && !forceShow && !hidden && skeleton) {
    return <div data-testid="lightweight-route-shell-skeleton">{skeleton}</div>;
  }

  return <div data-testid="lightweight-route-shell-ready">{children}</div>;
}
