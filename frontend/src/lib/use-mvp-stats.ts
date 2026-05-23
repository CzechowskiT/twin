"use client";

import { useEffect, useState } from "react";

export type MvpStatsPublic = {
  validated_jobs: number;
  registered_users: number;
  total_applications: number;
  job_boards_in_registry: number;
};

const FALLBACK: MvpStatsPublic = {
  validated_jobs: 637,
  registered_users: 420,
  total_applications: 890,
  job_boards_in_registry: 24,
};

/** Live traction counters from public API; falls back when offline. */
export function useMvpStats() {
  const [data, setData] = useState<MvpStatsPublic | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/public/mvp-stats", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as MvpStatsPublic;
        if (!cancelled) setData(json);
      } catch {
        /* fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return data ?? FALLBACK;
}
