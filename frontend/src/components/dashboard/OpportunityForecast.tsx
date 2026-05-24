"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/components/language-provider";
import { FeaturePaywall } from "@/components/billing/FeaturePaywall";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type ForecastJob = {
  job_id: number;
  title: string;
  company: string;
  score: number;
  band: string;
  skill_match_percent: number;
  learning_path?: Array<{ area: string; suggestion: string; impact: string }>;
  learning_path_source?: string;
};

type ForecastData = {
  perfect: ForecastJob[];
  near_miss: ForecastJob[];
  stretch: ForecastJob[];
  summary: { perfect_count: number; near_miss_count: number; stretch_count: number };
  paywall?: { feature: string; required_tier: string; upgrade_path: string } | null;
  learning_path_paywall?: { feature: string; required_tier: string; upgrade_path: string } | null;
};

const BAND_KEYS = {
  perfect: "strategic.forecastPerfect",
  near_miss: "strategic.forecastNearMiss",
  stretch: "strategic.forecastStretch",
} as const;

export function OpportunityForecast() {
  const { t } = useTranslation();
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<ForecastData>("/api/v1/opportunities/forecast", {}, token);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="twin-muted text-sm">{t("strategic.loading")}</p>;
  }
  if (!data) return null;

  const bands: Array<keyof typeof BAND_KEYS> = ["perfect", "near_miss", "stretch"];

  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">{t("strategic.forecastTitle")}</h2>
      <p className="twin-muted text-sm">{t("strategic.forecastBody")}</p>
      <FeaturePaywall paywall={data.paywall} />
      <FeaturePaywall paywall={data.learning_path_paywall} titleKey="strategic.learningPathPaywallTitle" />
      <div className="grid gap-4 md:grid-cols-3">
        {bands.map((band) => (
          <div key={band} className="rounded-lg border border-[var(--twin-border)] p-3">
            <h3 className="text-sm font-semibold">{t(BAND_KEYS[band])}</h3>
            <p className="twin-muted text-xs">
              {String((data[band] as ForecastJob[]).length)} {t("strategic.forecastRoles")}
            </p>
            <ul className="mt-2 space-y-2">
              {(data[band] as ForecastJob[]).slice(0, 5).map((job) => (
                <li key={job.job_id} className="text-sm">
                  <span className="font-medium">{job.title}</span>
                  <span className="twin-muted"> · {job.company}</span>
                  <span className="ml-1 text-xs text-[var(--twin-accent)]">{Math.round(job.score)}%</span>
                  {job.learning_path && job.learning_path.length > 0 && band !== "perfect" ? (
                    <ul className="twin-muted mt-1 space-y-0.5 text-xs">
                      {job.learning_path.slice(0, 2).map((step, idx) => (
                        <li key={`${job.job_id}-lp-${idx}`}>
                          {job.learning_path_source === "claude" ? "✦ " : "• "}
                          {step.suggestion}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
