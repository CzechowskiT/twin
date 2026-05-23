"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CandidateWorkspaceSubnav } from "@/components/candidate-workspace-subnav";
import { useTranslation } from "@/components/language-provider";
import { WorkspaceFlowSteps } from "@/components/ux/workspace-flow-steps";
import { Button, Card, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type AutoApplySettings = {
  is_active: boolean;
  min_score_threshold: number;
  daily_limit: number;
  consent_given_at: string | null;
  total_applications_submitted: number;
  last_run_at: string | null;
  next_run_label: string;
  supported_boards: string;
  profile_ready: boolean;
  onboarding_completed: boolean;
};

type TriggerOut = {
  applications_submitted: number;
  applications_failed: number;
  skipped_reason: string | null;
  message: string;
};

export default function NightlyAutoApplySettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AutoApplySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<AutoApplySettings>("/api/v1/auto-apply/settings");
      setSettings(data);
      if (!data.profile_ready) {
        setError(t("dashboard.nightlyAutoApplyNeedProfile"));
      }
    } catch {
      setError(t("dashboard.nightlyAutoApplyNeedProfile"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function enableWithConsent() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<AutoApplySettings>("/api/v1/auto-apply/consent", {
        method: "POST",
        body: JSON.stringify({
          consent_acknowledged: true,
          min_score_threshold: settings.min_score_threshold,
          daily_limit: settings.daily_limit,
        }),
      });
      setSettings(data);
      setShowConsent(false);
      setStatus(t("dashboard.nightlyAutoApplyEnabledHint").replace("{time}", data.next_run_label));
    } catch {
      setError("Failed to save consent");
    } finally {
      setSaving(false);
    }
  }

  async function patch(partial: Partial<AutoApplySettings>) {
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<AutoApplySettings>("/api/v1/auto-apply/settings", {
        method: "PATCH",
        body: JSON.stringify({
          is_active: partial.is_active,
          min_score_threshold: partial.min_score_threshold,
          daily_limit: partial.daily_limit,
        }),
      });
      setSettings(data);
    } catch {
      setError("Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setTriggering(true);
    setError(null);
    setStatus(null);
    try {
      const out = await apiFetch<TriggerOut>("/api/v1/auto-apply/trigger", { method: "POST" });
      setStatus(t("dashboard.nightlyAutoApplyTriggerOk").replace("{message}", out.message));
      await load();
    } catch (err) {
      const detail = err instanceof Error ? err.message : t("dashboard.nightlyAutoApplyTriggerFail");
      setError(detail || t("dashboard.nightlyAutoApplyTriggerFail"));
    } finally {
      setTriggering(false);
    }
  }

  const nextTime = settings?.next_run_label ?? "02:00";

  return (
    <Shell rail>
      <div className="space-y-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
              {t("dashboard.nightlyAutoApplyTitle")}
            </p>
            <h1 className="twin-page-intro twin-section-title mt-1 text-xl sm:text-2xl">
              {t("dashboard.nightlyAutoApplyTitle")}
            </h1>
            <p className="twin-muted mt-2 max-w-prose text-sm leading-relaxed">{t("dashboard.nightlyAutoApplyLead")}</p>
          </div>
          <CandidateWorkspaceSubnav ariaLabel={t("dashboard.nightlyAutoApplyTitle")} />
        </div>
        <WorkspaceFlowSteps current="actions" className="mb-2" />
        <Link href="/dashboard" className="twin-btn-secondary twin-touch-target inline-block !w-auto text-sm">
          ← {t("dashboard.title")}
        </Link>

        {loading && <p className="text-sm text-[var(--twin-muted)]">…</p>}
        {error && (
          <Card className="border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
            <p>{error}</p>
            {settings && !settings.profile_ready ? (
              <Link href="/profile" className="twin-link mt-2 inline-block text-sm">
                {t("dashboard.jobsEmptyZeroProfileCta")} →
              </Link>
            ) : null}
          </Card>
        )}

        {settings && (
          <>
            {!settings.consent_given_at && settings.profile_ready ? (
              <Card variant="soft" className="border-[var(--twin-accent-muted)] p-5">
                <p className="font-semibold text-[var(--foreground)]">{t("dashboard.nightlyAutoApplyConsentNudgeTitle")}</p>
                <p className="twin-muted mt-2 text-sm leading-relaxed">{t("dashboard.nightlyAutoApplyConsentNudgeBody")}</p>
                <Button type="button" className="twin-btn-primary mt-4 !w-auto" onClick={() => setShowConsent(true)}>
                  {t("dashboard.nightlyAutoApplyConsentNudgeCta")}
                </Button>
              </Card>
            ) : null}

            <Card className="space-y-4 p-5">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="font-semibold">{t("dashboard.nightlyAutoApplyEnable")}</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--twin-accent)]"
                  checked={settings.is_active}
                  disabled={saving || !settings.profile_ready}
                  onChange={(e) => {
                    if (!settings.profile_ready) return;
                    if (e.target.checked && !settings.consent_given_at) {
                      setShowConsent(true);
                      return;
                    }
                    void patch({ is_active: e.target.checked });
                  }}
                />
              </label>
              {settings.is_active && (
                <p className="text-xs text-[var(--twin-muted)]">
                  {t("dashboard.nightlyAutoApplyEnabledHint").replace("{time}", nextTime)}
                </p>
              )}
            </Card>

            {settings.consent_given_at && (
              <Card className="space-y-5 p-5">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{t("dashboard.nightlyAutoApplyMinScore")}</span>
                    <span className="font-bold text-[var(--twin-accent)]">
                      {Math.round(settings.min_score_threshold)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={75}
                    max={100}
                    step={5}
                    value={settings.min_score_threshold}
                    className="w-full"
                    onChange={(e) =>
                      setSettings((s) =>
                        s ? { ...s, min_score_threshold: Number(e.target.value) } : s,
                      )
                    }
                  />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{t("dashboard.nightlyAutoApplyDailyLimit")}</span>
                    <span className="font-bold text-[var(--twin-accent)]">{settings.daily_limit}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={settings.daily_limit}
                    className="w-full"
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, daily_limit: Number(e.target.value) } : s))
                    }
                  />
                </div>
                <Button
                  type="button"
                  className="twin-btn-primary w-full"
                  disabled={saving}
                  onClick={() =>
                    void patch({
                      min_score_threshold: settings.min_score_threshold,
                      daily_limit: settings.daily_limit,
                    })
                  }
                >
                  {t("dashboard.nightlyAutoApplySave")}
                </Button>
              </Card>
            )}

            {settings.consent_given_at && (
              <Card className="grid gap-4 p-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-[var(--twin-muted)]">
                    {t("dashboard.nightlyAutoApplyStatsTotal")}
                  </p>
                  <p className="text-xl font-bold">{settings.total_applications_submitted}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--twin-muted)]">
                    {t("dashboard.nightlyAutoApplyStatsLastRun")}
                  </p>
                  <p className="text-sm font-semibold">
                    {settings.last_run_at
                      ? new Date(settings.last_run_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--twin-muted)]">
                    {t("dashboard.nightlyAutoApplyStatsNextRun")}
                  </p>
                  <p className="text-sm font-semibold">{settings.next_run_label}</p>
                </div>
              </Card>
            )}

            <Card className="p-5 text-sm">
              <p className="mb-1 font-semibold">{t("dashboard.nightlyAutoApplySupportedBoards")}</p>
              <p className="text-[var(--twin-muted)]">{settings.supported_boards}</p>
            </Card>

            {settings.is_active && settings.consent_given_at && (
              <Button
                type="button"
                className="twin-btn-secondary w-full"
                disabled={saving || triggering}
                onClick={() => void runNow()}
              >
                {triggering
                  ? t("dashboard.nightlyAutoApplyTriggerRunning")
                  : t("dashboard.nightlyAutoApplyTrigger")}
              </Button>
            )}

            {status && (
              <div className="space-y-2 text-sm text-[var(--twin-muted-strong)]">
                <p>{status}</p>
                <Link href="/dashboard/applications" className="twin-link inline-block text-sm">
                  {t("dashboard.nightlyAutoApplyTriggerViewApps")}
                </Link>
              </div>
            )}
          </>
        )}

        {showConsent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal
          >
            <Card className="max-w-lg space-y-4 p-6">
              <h2 className="text-lg font-bold">{t("dashboard.nightlyAutoApplyConsentTitle")}</h2>
              <p className="text-sm text-[var(--twin-muted)]">
                {t("dashboard.nightlyAutoApplyConsentBody")}
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  className="twin-btn-secondary flex-1"
                  onClick={() => setShowConsent(false)}
                >
                  {t("dashboard.nightlyAutoApplyConsentCancel")}
                </Button>
                <Button
                  type="button"
                  className="twin-btn-primary flex-1"
                  disabled={saving}
                  onClick={() => void enableWithConsent()}
                >
                  {t("dashboard.nightlyAutoApplyConsentAccept")}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Shell>
  );
}
