"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { LOCALE_HTML_LANG, type TranslationKey } from "@/lib/i18n";

type Settings = {
  is_active: boolean;
  consent_given_at: string | null;
  profile_ready: boolean;
  verified_readiness_ready: boolean;
  total_applications_submitted: number;
  last_run_at: string | null;
  next_run_label: string;
};

type SweepBoardStat = {
  board: string;
  submitted: number;
  failed: number;
  skipped: number;
};

type LastSweep = {
  started_at: string | null;
  finished_at: string | null;
  total_applications_submitted: number;
  total_applications_failed: number;
  total_applications_skipped: number;
  boards: SweepBoardStat[];
  is_demo_seed: boolean;
};

function formatSweepTime(iso: string, locale: string): string {
  const date = new Date(iso);
  const loc = LOCALE_HTML_LANG[locale as keyof typeof LOCALE_HTML_LANG] ?? locale;
  return date.toLocaleString(loc, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: locale === "pl" ? "Europe/Warsaw" : undefined,
  });
}

function boardLabel(boards: SweepBoardStat[]): string {
  const names = boards
    .filter((b) => b.submitted > 0 || b.failed > 0)
    .map((b) => b.board);
  return names.length > 0 ? names.join(", ") : "pracuj.pl";
}

function sweepSummary(
  sweep: LastSweep,
  t: (key: TranslationKey) => string,
): string | null {
  const submitted = sweep.total_applications_submitted;
  const failed = sweep.total_applications_failed;
  const skipped = sweep.total_applications_skipped;
  const boards = boardLabel(sweep.boards);

  if (submitted === 0 && failed === 0 && skipped === 0) {
    return null;
  }
  if (submitted > 0 && failed > 0) {
    return t("dashboard.nightlyAutoApplySweepPartial")
      .replace("{submitted}", String(submitted))
      .replace("{failed}", String(failed))
      .replace("{boards}", boards);
  }
  if (submitted > 0) {
    return t("dashboard.nightlyAutoApplySweepSubmitted").replace("{count}", String(submitted));
  }
  if (failed > 0) {
    return t("dashboard.nightlyAutoApplySweepFailedOnly")
      .replace("{count}", String(failed))
      .replace("{boards}", boards);
  }
  return t("dashboard.nightlyAutoApplySweepSkipped").replace("{count}", String(skipped));
}

export function NightlyAutoApplyStrip() {
  const { t, locale } = useTranslation();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sweep, setSweep] = useState<LastSweep | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    void apiFetch<Settings>("/api/v1/auto-apply/settings", {}, token)
      .then(setSettings)
      .catch(() => setSettings(null));
    void apiFetch<LastSweep>("/api/v1/auto-apply/last-sweep", {}, token)
      .then(setSweep)
      .catch(() => setSweep(null));
  }, []);

  if (!settings) return null;

  const needsConsent = settings.profile_ready && !settings.consent_given_at && !settings.is_active;
  const readinessBlocked = settings.profile_ready && !settings.verified_readiness_ready;
  const legacyActiveBlocked = settings.is_active && readinessBlocked;
  const sweepSummaryText = sweep?.started_at ? sweepSummary(sweep, t) : null;

  return (
    <div id="auto-apply-readiness" className="mb-4 scroll-mt-24 space-y-3">
      {needsConsent ? (
        <div
          className="rounded-xl border border-[var(--twin-accent-muted)] bg-[var(--twin-accent-muted)]/25 px-4 py-3 sm:px-5"
          role="status"
        >
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {t("dashboard.nightlyAutoApplyConsentNudgeTitle")}
          </p>
          <p className="twin-muted mt-1 text-xs leading-relaxed">{t("dashboard.nightlyAutoApplyConsentNudgeBody")}</p>
          <Link
            href="/dashboard/settings/auto-apply"
            className="twin-btn-secondary twin-touch-target mt-3 inline-flex text-xs"
          >
            {t("dashboard.nightlyAutoApplyConsentNudgeCta")}
          </Link>
        </div>
      ) : null}
      <div className="rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
              {t("dashboard.nightlyAutoApplyStripTitle")}
            </p>
            <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">
              {legacyActiveBlocked
                ? t("dashboard.nightlyAutoApplyStripLegacyActive")
                : readinessBlocked && !settings.is_active
                  ? t("dashboard.nightlyAutoApplyStripBlockedReadiness")
                  : settings.is_active
                    ? t("dashboard.nightlyAutoApplyStripActive")
                        .replace("{next}", settings.next_run_label)
                        .replace("{total}", String(settings.total_applications_submitted))
                    : t("dashboard.nightlyAutoApplyStripInactive")}
            </p>
            {settings.last_run_at ? (
              <p className="twin-muted mt-1 text-xs">
                {t("dashboard.nightlyAutoApplyStatsLastRun")}:{" "}
                {formatSweepTime(settings.last_run_at, locale)}
              </p>
            ) : null}
            {sweep?.started_at ? (
              <p className="twin-muted mt-1 text-xs">
                {t("dashboard.nightlyAutoApplyPlatformSweep")}: {formatSweepTime(sweep.started_at, locale)}
                {sweepSummaryText ? ` · ${sweepSummaryText}` : ""}
              </p>
            ) : (
              <p className="twin-muted mt-1 text-xs">{t("dashboard.nightlyAutoApplyPlatformSweepNone")}</p>
            )}
          </div>
          <Link
            href="/dashboard/settings/auto-apply"
            className="twin-btn-secondary twin-touch-target shrink-0 text-xs"
          >
            {t("dashboard.nightlyAutoApplyStripCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
