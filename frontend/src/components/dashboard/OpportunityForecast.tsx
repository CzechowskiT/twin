"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

type AutoApplySettings = {
  is_active: boolean;
  consent_given_at: string | null;
  profile_ready: boolean;
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
  const [autoApplyingId, setAutoApplyingId] = useState<number | null>(null);
  const [autoApplySettings, setAutoApplySettings] = useState<AutoApplySettings | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [forecast, settings] = await Promise.all([
        apiFetch<ForecastData>("/api/v1/opportunities/forecast", {}, token),
        apiFetch<AutoApplySettings>("/api/v1/auto-apply/settings", {}, token).catch(() => null),
      ]);
      setData(forecast);
      setAutoApplySettings(settings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const needsConsent =
    autoApplySettings?.profile_ready === true &&
    !autoApplySettings.consent_given_at &&
    !autoApplySettings.is_active;

  async function autoApplyToJob(jobId: number) {
    const token = getToken();
    if (!token) {
      toast.error(t("strategic.forecastAutoApplyNeedLogin"));
      return;
    }
    if (needsConsent) {
      toast.error(t("strategic.forecastAutoApplyConsentRequired"));
      return;
    }
    setAutoApplyingId(jobId);
    try {
      const result = await apiFetch<{
        success: boolean;
        message: string;
        package_pdf_url?: string | null;
      }>(
        "/api/v1/applications/auto-apply",
        { method: "POST", body: JSON.stringify({ job_id: jobId, human_acknowledged: true }) },
        token,
      );
      if (result.success) {
        toast.success(result.message || t("strategic.forecastAutoApplySuccess"));
      } else {
        toast.error(result.message || t("strategic.forecastAutoApplyFailed"));
      }
      if (result.package_pdf_url) {
        window.open(result.package_pdf_url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("strategic.forecastAutoApplyFailed");
      toast.error(message);
    } finally {
      setAutoApplyingId(null);
    }
  }

  if (loading) {
    return <p className="twin-muted text-sm">{t("strategic.loading")}</p>;
  }
  if (!data) return null;

  const bands: Array<keyof typeof BAND_KEYS> = ["perfect", "near_miss", "stretch"];

  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">{t("strategic.forecastTitle")}</h2>
      <p className="twin-muted text-sm">{t("strategic.forecastBody")}</p>
      {needsConsent ? (
        <p className="text-xs leading-relaxed text-[var(--twin-muted-strong)]">
          {t("strategic.forecastAutoApplyConsentRequired")}{" "}
          <Link href="/dashboard/settings/auto-apply" className="font-semibold text-[var(--twin-accent)] underline">
            {t("dashboard.nightlyAutoApplyConsentNudgeCta")}
          </Link>
        </p>
      ) : null}
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
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{job.title}</span>
                      <span className="twin-muted"> · {job.company}</span>
                      <span className="ml-1 text-xs text-[var(--twin-accent)]">{Math.round(job.score)}%</span>
                    </div>
                    <button
                      type="button"
                      aria-label={`${t("strategic.forecastAutoApply")}: ${job.title}, ${job.company}`}
                      disabled={autoApplyingId === job.job_id}
                      onClick={() => void autoApplyToJob(job.job_id)}
                      className="twin-btn-secondary twin-touch-target shrink-0 !w-auto border-[var(--twin-cta)] px-2 py-1 text-xs font-semibold text-[var(--twin-cta)]"
                      title={t("dashboard.autoApplyHint")}
                    >
                      {autoApplyingId === job.job_id
                        ? t("strategic.forecastAutoApplyRunning")
                        : t("strategic.forecastAutoApply")}
                    </button>
                  </div>
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
