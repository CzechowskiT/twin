"use client";

import { useEffect, useRef, useState } from "react";

import { usePageVisibility } from "@/hooks/use-page-visibility";

type LoadWhenVisibleOptions = {
  rootMargin?: string;
  /** When true, stays loaded after first intersection (default). */
  once?: boolean;
};

/**
 * Defers heavy subtree work until the element is near the viewport AND the tab is visible.
 * Hidden tabs never flip `shouldLoad` — avoids background layout/paint pressure.
 */
export function useLoadWhenVisible(options: LoadWhenVisibleOptions = {}) {
  const { rootMargin = "200px 0px", once = true } = options;
  const ref = useRef<HTMLDivElement | null>(null);
  const { visible: pageVisible } = usePageVisibility();
  const [intersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (once && intersecting) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIntersecting(true);
        else if (!once) setIntersecting(false);
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, once, intersecting]);

  const shouldLoad = intersecting && pageVisible;

  return { ref, shouldLoad, intersecting, pageVisible };
}
