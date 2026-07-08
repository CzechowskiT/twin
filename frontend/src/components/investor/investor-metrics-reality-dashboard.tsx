"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";
import { fetchPublicHealthJson } from "@/lib/public-health-client";
import {
  CONTROLLED_REVIEW_STATUS,
  formatGitCommitShort,
  INVESTOR_METRICS_VISUAL_MARKERS,
  INVESTOR_MODULE_DEMO_KEYS,
  INVESTOR_MODULE_LIVE_KEYS,
  INVESTOR_MODULE_NOT_LIVE_KEYS,
  INVESTOR_ROADMAP_MILESTONE_KEYS,
  LAUNCH_STANCE,
  resolveExternalInvitesSent,
  type InvestorModuleKey,
  type PublicHealthSnapshot,
} from "@/lib/investor-metrics-reality";
import { INVESTOR_METRICS_CONTROLLED_PREVIEW } from "@/lib/seven-day-d5-investor";

function ModuleList({ marker, keys, tone }: { marker: string; keys: readonly InvestorModuleKey[]; tone: "live" | "demo" | "notLive" }) {
  const { t } = useTranslation();
  const toneClass =
    tone === "live"
      ? "border-emerald-500/25 bg-emerald-500/5"
      : tone === "demo"
        ? "border-[var(--twin-accent)]/25 bg-[var(--twin-accent)]/5"
        : "border-amber-500/25 bg-amber-500/5";
  return (
    <ul className={`${marker} space-y-2 rounded-xl border p-4 sm:p-5 ${toneClass}`}>
      {keys.map((key) => (
        <li key={key} className="flex gap-2 text-sm leading-relaxed text-[var(--foreground)]">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--twin-muted-strong)]" aria-hidden />
          {t(`investorMetrics.${key}`)}
        </li>
      ))}
    </ul>
  );
}

function HealthRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/80 px-3 py-2.5">
      <dt className="text-xs font-medium text-[var(--twin-muted-strong)]">{label}</dt>
      <dd className={`text-xs font-mono tabular-nums ${ok === false ? "text-amber-400" : ok === true ? "text-emerald-400" : "text-[var(--foreground)]"}`}>{value}</dd>
    </div>
  );
}

export function InvestorMetricsRealityDashboard() {
  const { t, locale } = useTranslation();
  const [health, setHealth] = useState<PublicHealthSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchPublicHealthJson<PublicHealthSnapshot>();
        if (!cancelled) setHealth(data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loc = locale === "pl" ? "pl-PL" : "en-US";
  const invites = resolveExternalInvitesSent(undefined);
  const nightlyPaused = health?.celery?.nightly_auto_apply_beat_enabled !== true;

  return (
    <Shell wide>
      <div className="mx-auto max-w-5xl" data-testid={INVESTOR_METRICS_VISUAL_MARKERS.page}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--twin-accent)]">{t("investorMetrics.eyebrow")}</p>
        <h1 className="twin-page-intro mt-2 text-2xl font-semibold sm:text-3xl">{t("investorMetrics.title")}</h1>
        <p className="twin-muted mt-3 max-w-3xl text-sm leading-relaxed">{t("investorMetrics.lead")}</p>
        {INVESTOR_METRICS_CONTROLLED_PREVIEW ? (
          <Card variant="soft" className="mt-4 border-[var(--twin-border)]/80 p-4" data-seven-day-investor-metrics-controlled-preview>
            <p className="text-sm leading-relaxed text-[var(--twin-muted-strong)]">{t("sevenDayD5.metricsControlledPreviewBody")}</p>
          </Card>
        ) : null}
        <Card variant="soft" className={`${INVESTOR_METRICS_VISUAL_MARKERS.transparencyBanner} mt-6 border-[var(--twin-accent)]/20 bg-[var(--twin-surface-2)] p-5 sm:p-6`}>
          <p className="text-sm font-semibold text-[var(--foreground)]">{t("investorMetrics.transparencyTitle")}</p>
          <p className="twin-muted mt-2 text-sm leading-relaxed">{t("investorMetrics.transparencyBody")}</p>
        </Card>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className={`${INVESTOR_METRICS_VISUAL_MARKERS.launchStance} flex flex-col p-5 sm:p-6`} data-launch-stance={LAUNCH_STANCE}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">{t("investorMetrics.launchStanceTitle")}</p>
            <p className="mt-3 text-2xl font-semibold uppercase tracking-wide text-amber-400">{t("investorMetrics.launchStanceNoGo")}</p>
            <p className="twin-muted mt-3 text-xs leading-relaxed">{t("investorMetrics.launchStanceDetail")}</p>
          </Card>
          <Card className={`${INVESTOR_METRICS_VISUAL_MARKERS.controlledReview} flex flex-col p-5 sm:p-6`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">{t("investorMetrics.controlledReviewTitle")}</p>
            <p className="mt-3 text-lg font-semibold text-[var(--foreground)]" data-controlled-review={CONTROLLED_REVIEW_STATUS}>{t("investorMetrics.controlledReviewH5c")}</p>
            <p className="twin-muted mt-3 text-xs leading-relaxed">{t("investorMetrics.controlledReviewDetail")}</p>
          </Card>
          <Card className={`${INVESTOR_METRICS_VISUAL_MARKERS.externalInvites} flex flex-col p-5 sm:p-6`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">{t("investorMetrics.externalInvitesTitle")}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-[var(--foreground)]" data-invites-source={invites.source}>{invites.count.toLocaleString(loc)}</p>
            <p className="twin-muted mt-3 text-xs leading-relaxed">{t("investorMetrics.externalInvitesNote")}</p>
          </Card>
        </div>
        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">{t("investorMetrics.productReadinessTitle")}</h2>
          <p className="twin-muted mt-1 max-w-3xl text-sm leading-relaxed">{t("investorMetrics.productReadinessLead")}</p>
          <p className="mt-2 inline-flex rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-2)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--twin-muted-strong)]">{t("investorMetrics.productReadinessBadge")}</p>
        </section>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-emerald-400">{t("investorMetrics.modulesLiveTitle")}</h3>
            <ModuleList marker={INVESTOR_METRICS_VISUAL_MARKERS.liveSection} keys={INVESTOR_MODULE_LIVE_KEYS} tone="live" />
          </div>
          <div>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--twin-accent)]">{t("investorMetrics.modulesDemoTitle")}</h3>
            <ModuleList marker={INVESTOR_METRICS_VISUAL_MARKERS.demoSection} keys={INVESTOR_MODULE_DEMO_KEYS} tone="demo" />
          </div>
          <div>
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-amber-400">{t("investorMetrics.modulesNotLiveTitle")}</h3>
            <ModuleList marker={INVESTOR_METRICS_VISUAL_MARKERS.notLiveSection} keys={INVESTOR_MODULE_NOT_LIVE_KEYS} tone="notLive" />
          </div>
        </div>
        <section className={`${INVESTOR_METRICS_VISUAL_MARKERS.technicalHealth} mt-10`}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">{t("investorMetrics.technicalHealthTitle")}</h2>
          <p className="twin-muted mt-1 max-w-3xl text-sm leading-relaxed">{t("investorMetrics.technicalHealthLead")}</p>
          {err ? <p className="mt-4 text-sm text-amber-400">{t("investorMetrics.loadFailed")}</p> : null}
          {!err && !health ? <p className="twin-muted mt-4 text-sm">{t("common.loadingEllipsis")}</p> : null}
          {health ? (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              <HealthRow label={t("investorMetrics.healthApi")} value={health.status ?? t("investorMetrics.healthUnavailable")} ok={health.status === "ok"} />
              <HealthRow label={t("investorMetrics.healthDatabase")} value={health.db_ok ? t("investorMetrics.healthOk") : t("investorMetrics.healthUnavailable")} ok={!!health.db_ok} />
              <HealthRow label={t("investorMetrics.healthGit")} value={formatGitCommitShort(health.git_commit)} />
              <HealthRow label={t("investorMetrics.healthCelery")} value={health.celery?.worker_active ? t("investorMetrics.healthActive") : t("investorMetrics.healthUnavailable")} ok={!!health.celery?.worker_active} />
              <HealthRow label={t("investorMetrics.healthAutoApply")} value={nightlyPaused ? t("investorMetrics.healthPaused") : t("investorMetrics.healthActive")} ok={nightlyPaused} />
              <HealthRow label={t("investorMetrics.healthScrape")} value={health.scrape_worker_ready ? t("investorMetrics.healthActive") : t("investorMetrics.healthUnavailable")} ok={!!health.scrape_worker_ready} />
            </dl>
          ) : null}
        </section>
        <section className={`${INVESTOR_METRICS_VISUAL_MARKERS.roadmap} mt-10`}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--twin-muted-strong)]">{t("investorMetrics.roadmapTitle")}</h2>
          <p className="twin-muted mt-1 max-w-3xl text-sm leading-relaxed">{t("investorMetrics.roadmapLead")}</p>
          <ol className="mt-4 space-y-3">
            {INVESTOR_ROADMAP_MILESTONE_KEYS.map((key, index) => (
              <li key={key} className="rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-2)]/60 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">{t("investorMetrics.roadmapStep").replace("{step}", String(index + 1))}</p>
                <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{t(`investorMetrics.${key}Title`)}</p>
                <p className="twin-muted mt-1 text-xs leading-relaxed">{t(`investorMetrics.${key}Body`)}</p>
              </li>
            ))}
          </ol>
        </section>
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/investor/calculator" className="twin-link font-medium">{t("investorMetrics.calcLink")}</Link>
          <Link href="/status" className="twin-link font-medium">{t("investorMetrics.statusLink")}</Link>
          <Link href="/investor/data-room" className="twin-link font-medium">{t("investorMetrics.dataRoomLink")}</Link>
        </div>
      </div>
    </Shell>
  );
}
