"use client";

import { useEffect, useState } from "react";

import { useBackgroundAwareInterval } from "@/hooks/use-background-aware-interval";
import { betaFetchLeaderboard, betaFetchStats, type BetaLeaderboardEntry, type BetaStats } from "@/lib/beta-api";
import { WAITLIST_LEADERBOARD_REWARD_EN } from "@/lib/waitlist/leaderboard-reward";

const DEMO_LEADERBOARD: BetaLeaderboardEntry[] = [
  { rank: 1, display_name: "Paweł M.", referrals: 47, reward: WAITLIST_LEADERBOARD_REWARD_EN },
  { rank: 2, display_name: "Anna K.", referrals: 39, reward: WAITLIST_LEADERBOARD_REWARD_EN },
  { rank: 3, display_name: "Marcin S.", referrals: 31, reward: WAITLIST_LEADERBOARD_REWARD_EN },
  { rank: 4, display_name: "Kasia W.", referrals: 28, reward: WAITLIST_LEADERBOARD_REWARD_EN },
  { rank: 5, display_name: "Tom R.", referrals: 24, reward: WAITLIST_LEADERBOARD_REWARD_EN },
];

export function useWaitlistStats() {
  const [stats, setStats] = useState<BetaStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<BetaLeaderboardEntry[]>(DEMO_LEADERBOARD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [s, lb] = await Promise.all([betaFetchStats(), betaFetchLeaderboard(10)]);
        if (!alive) return;
        setStats(s);
        if (lb.length > 0) setLeaderboard(lb);
        setError(null);
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : "Stats unavailable");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  useBackgroundAwareInterval(() => {
    void (async () => {
      try {
        const [s, lb] = await Promise.all([betaFetchStats(), betaFetchLeaderboard(10)]);
        setStats(s);
        if (lb.length > 0) setLeaderboard(lb);
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Stats unavailable");
      }
    })();
  }, 8000);

  const spotsRemaining = stats?.spots_left ?? 347;
  const signupsToday = stats?.signups_today ?? 23;
  const cap = stats?.cap ?? 1000;
  const total = stats?.total_signups ?? cap - spotsRemaining;
  const statsLive = stats !== null;

  return { stats, leaderboard, error, loading, spotsRemaining, signupsToday, cap, total, statsLive };
}
