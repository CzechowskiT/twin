"use client";

import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";

type MvpStats = {
  validated_jobs: number;
  registered_users: number;
  total_applications: number;
  profiles_with_cv: number;
  job_boards_in_registry: number;
  generated_at: string;
  linkedin_oauth_configured: boolean;
  stripe_checkout_ready: boolean;
};

export function MvpLiveStatsStrip() {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<MvpStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/public/mvp-stats", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as MvpStats;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const fmt = (n: number) => n.toLocaleString(loc);
  const flag = (on: boolean) => (on ? t("investorCalc.liveStatsOn") : t("investorCalc.liveStatsOff"));

  if (failed) {
    return (
      <p
        role="status"
        className="mx-auto mb-8 max-w-4xl rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-center text-xs text-amber-900 dark:text-amber-100"
      >
        {t("investorCalc.liveStatsUnavailable")}
      </p>
    );
  }

  if (!data) {
    return (
      <div
        className="mx-auto mb-8 max-w-4xl animate-pulse rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-2)] px-4 py-10 text-center text-xs text-[var(--twin-muted)]"
        aria-busy="true"
      >
        {t("investorCalc.liveStatsLoading")}
      </div>
    );
  }

  const snap = new Date(data.generated_at).toLocaleString(loc);

  return (
    <section
      className="mx-auto mb-8 max-w-4xl rounded-xl border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] p-4 sm:p-5"
      aria-label={t("investorCalc.liveStatsTitle")}
    >
      <div className="mb-4 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-accent)]">
          {t("investorCalc.liveStatsEyebrow")}
        </p>
        <h2 className="mt-1 text-base font-semibold text-[var(--foreground)]">{t("investorCalc.liveStatsTitle")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--twin-muted-strong)]">{t("investorCalc.liveStatsLead")}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        <div className="rounded-lg bg-[var(--twin-surface-2)] px-3 py-2 text-center">
          <dt className="text-[10px] font-medium uppercase text-[var(--twin-muted-strong)]">{t("investorCalc.liveStatsJobs")}</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-[var(--foreground)]">{fmt(data.validated_jobs)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--twin-surface-2)] px-3 py-2 text-center">
          <dt className="text-[10px] font-medium uppercase text-[var(--twin-muted-strong)]">{t("investorCalc.liveStatsUsers")}</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-[var(--foreground)]">{fmt(data.registered_users)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--twin-surface-2)] px-3 py-2 text-center">
          <dt className="text-[10px] font-medium uppercase text-[var(--twin-muted-strong)]">{t("investorCalc.liveStatsApps")}</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-[var(--foreground)]">{fmt(data.total_applications)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--twin-surface-2)] px-3 py-2 text-center">
          <dt className="text-[10px] font-medium uppercase text-[var(--twin-muted-strong)]">{t("investorCalc.liveStatsCv")}</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-[var(--foreground)]">{fmt(data.profiles_with_cv)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--twin-surface-2)] px-3 py-2 text-center">
          <dt className="text-[10px] font-medium uppercase text-[var(--twin-muted-strong)]">{t("investorCalc.liveStatsBoards")}</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-[var(--foreground)]">{fmt(data.job_boards_in_registry)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--twin-surface-2)] px-3 py-2 text-center">
          <dt className="text-[10px] font-medium uppercase text-[var(--twin-muted-strong)]">{t("investorCalc.liveStatsLinkedin")}</dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{flag(data.linkedin_oauth_configured)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--twin-surface-2)] px-3 py-2 text-center">
          <dt className="text-[10px] font-medium uppercase text-[var(--twin-muted-strong)]">{t("investorCalc.liveStatsStripe")}</dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{flag(data.stripe_checkout_ready)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-center text-[10px] text-[var(--twin-muted)]">{t("investorCalc.liveStatsAsOf").replace("{ts}", snap)}</p>
    </section>
  );
}
