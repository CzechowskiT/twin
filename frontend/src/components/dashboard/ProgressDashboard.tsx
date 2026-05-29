"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { FeaturePaywall } from "@/components/billing/FeaturePaywall";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type ProgressData = {
  xp_total: number;
  level: number;
  streak_days: number;
  badges: { id: string; title: string }[];
  applications_count: number;
  xp_to_next_level: number;
  paywall?: { feature: string; required_tier: string; upgrade_path: string } | null;
};

export function ProgressDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<ProgressData | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const res = await apiFetch<ProgressData>("/api/v1/gamification/my-progress", {}, token);
    setData(res);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  if (!data) return null;

  return (
    <Card className="space-y-3 p-4">
      <h2 className="text-lg font-semibold">{t("strategic.progressTitle")}</h2>
      <FeaturePaywall paywall={data.paywall} />
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="twin-muted">{t("strategic.progressLevel")}</span>{" "}
          <strong>{data.level}</strong>
        </div>
        <div>
          <span className="twin-muted">{t("strategic.progressXp")}</span>{" "}
          <strong>{data.xp_total}</strong>
        </div>
        <div>
          <span className="twin-muted">{t("strategic.progressStreak")}</span>{" "}
          <strong>{data.streak_days}</strong>
        </div>
        <div>
          <span className="twin-muted">{t("strategic.progressApplications")}</span>{" "}
          <strong>{data.applications_count}</strong>
        </div>
      </div>
      <p className="text-xs text-[var(--twin-muted-strong)]">
        {t("strategic.progressXpToNext").replace("{xp}", String(data.xp_to_next_level))}
      </p>
      {data.badges.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {data.badges.map((b) => (
            <li
              key={b.id}
              className="rounded-full border border-[var(--twin-accent)]/40 bg-[var(--twin-accent-muted)]/30 px-2 py-0.5 text-xs"
            >
              {b.title}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
