"use client";

import { useEffect, useState } from "react";

export type MvpStatsPublic = {
  validated_jobs: number;
  registered_users: number;
  total_applications: number;
  job_boards_in_registry: number;
};

/** Live traction counters from public API; null when loading or unavailable (no fake fallbacks). */
export function useMvpStats() {
  const [data, setData] = useState<MvpStatsPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/public/mvp-stats", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as MvpStatsPublic;
        if (!cancelled) setData(json);
      } catch {
        /* leave null */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
