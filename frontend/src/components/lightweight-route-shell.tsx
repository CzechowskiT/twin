"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";

import { usePageVisibility } from "@/hooks/use-page-visibility";

// Fallback only if layout effect never runs (should not block real content in practice).
const SLOW_PAINT_MS = 4_000;

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
  // Match server first paint — never read document.hidden before hydration (React #418).
  const [paintReady, setPaintReady] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (hidden) {
      setPaintReady(true);
    }
  }, [hidden]);

  useLayoutEffect(() => {
    setPaintReady(true);
    // Schedule rAF without gating paint — keeps multitab CDP smoke compatible.
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {});
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  useEffect(() => {
    if (paintReady || hidden) return;
    const timer = window.setTimeout(() => setForceShow(true), SLOW_PAINT_MS);
    return () => window.clearTimeout(timer);
  }, [paintReady, hidden]);

  if (hidden) {
    return <div data-testid="lightweight-route-shell-ready">{children}</div>;
  }

  if (!paintReady && !forceShow && skeleton) {
    return <div data-testid="lightweight-route-shell-skeleton">{skeleton}</div>;
  }

  return <div data-testid="lightweight-route-shell-ready">{children}</div>;
}
