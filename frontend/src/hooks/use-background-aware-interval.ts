"use client";

import { useEffect, useRef } from "react";

import { usePageVisibility } from "@/hooks/use-page-visibility";

type BackgroundIntervalOptions = {
  /** Run once immediately when the interval starts (visible tab only). */
  immediate?: boolean;
  /** When true (default), the interval does not fire while the tab is hidden. */
  pauseWhenHidden?: boolean;
};

/**
 * `setInterval` that pauses in background tabs so multi-tab workspaces do not
 * stack identical polling work.
 */
export function useBackgroundAwareInterval(
  callback: () => void,
  delayMs: number | null,
  options?: BackgroundIntervalOptions,
): void {
  const { hidden } = usePageVisibility();
  const pauseWhenHidden = options?.pauseWhenHidden !== false;
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (delayMs == null || delayMs <= 0) return;
    if (pauseWhenHidden && hidden) return;

    if (options?.immediate) saved.current();

    const id = window.setInterval(() => saved.current(), delayMs);
    return () => window.clearInterval(id);
  }, [delayMs, hidden, options?.immediate, pauseWhenHidden]);
}

type BackgroundPollingOptions = {
  /** Multiplier applied to `intervalMs` while hidden (default 4). */
  hiddenBackoffFactor?: number;
};

/**
 * Async polling loop with `setTimeout` — backs off when `document.hidden`.
 */
export function useBackgroundAwarePolling(
  tick: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
  options?: BackgroundPollingOptions,
): void {
  const { hidden } = usePageVisibility();
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const hiddenFactor = options?.hiddenBackoffFactor ?? 4;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let cancelled = false;
    let timer: number | undefined;

    const schedule = (ms: number) => {
      timer = window.setTimeout(() => void run(), ms);
    };

    const run = async () => {
      if (cancelled) return;
      if (document.hidden) {
        schedule(intervalMs * hiddenFactor);
        return;
      }
      try {
        await tickRef.current();
      } finally {
        if (!cancelled) schedule(intervalMs);
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, hidden, intervalMs, hiddenFactor]);
}
