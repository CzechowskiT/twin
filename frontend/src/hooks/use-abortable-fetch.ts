"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Fetch helper that aborts the in-flight request on unmount or when superseded.
 * Rejects with `AbortError` when aborted — callers should ignore that case.
 */
export function useAbortableFetch() {
  const controllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const fetchWithAbort = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        return await fetch(input, { ...init, signal: controller.signal });
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [],
  );

  useEffect(() => () => abort(), [abort]);

  return { fetch: fetchWithAbort, abort };
}
