"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Settings = {
  is_active: boolean;
  total_applications_submitted: number;
  last_run_at: string | null;
  next_run_label: string;
};

type LastSweep = {
  started_at: string | null;
  finished_at: string | null;
  total_applications_submitted: number;
  total_applications_failed: number;
};

export function NightlyAutoApplyStrip() {
  const { t } = useTranslation();
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

  return (
    <div className="mb-4 rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/50 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">
            {t("dashboard.nightlyAutoApplyStripTitle")}
          </p>
          <p className="mt-1 text-sm text-[var(--twin-muted-strong)]">
            {settings.is_active
              ? t("dashboard.nightlyAutoApplyStripActive")
                  .replace("{next}", settings.next_run_label)
                  .replace("{total}", String(settings.total_applications_submitted))
              : t("dashboard.nightlyAutoApplyStripInactive")}
          </p>
          {settings.last_run_at ? (
            <p className="twin-muted mt-1 text-xs">
              {t("dashboard.nightlyAutoApplyStatsLastRun")}:{" "}
              {new Date(settings.last_run_at).toLocaleString()}
            </p>
          ) : null}
          {sweep?.started_at ? (
            <p className="twin-muted mt-1 text-xs">
              {t("dashboard.nightlyAutoApplyPlatformSweep")}: {new Date(sweep.started_at).toLocaleString()}
              {sweep.total_applications_submitted > 0
                ? ` · ${sweep.total_applications_submitted} apps`
                : ""}
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
  );
}
