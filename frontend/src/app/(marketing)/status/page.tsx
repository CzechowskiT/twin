"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";
import { MarketingPageSurface } from "@/components/marketing/marketing-page-surface";
import { Card, Shell } from "@/components/ui";

type MvpStats = {
  validated_jobs: number;
  database_reachable: boolean;
  mail_configured: boolean;
  google_calendar_configured: boolean;
  microsoft_calendar_configured: boolean;
  linkedin_oauth_configured: boolean;
  stripe_checkout_ready: boolean;
  generated_at: string;
};

type HealthPayload = {
  status: string;
  db_ok?: boolean;
  git_commit?: string;
  mail_configured?: boolean;
  google_calendar_configured?: boolean;
  microsoft_calendar_configured?: boolean;
  stripe_checkout_ready?: boolean;
  scrape_worker_ready?: boolean;
  scrape_beat_enabled?: boolean;
  market_coverage_last_scrape_at?: string | null;
  market_coverage_progress_pct?: number | null;
  market_coverage_feed_stale?: boolean;
  market_coverage_ops_hint?: string;
  partner_export_configured?: boolean;
  recruiter_inbox_configured?: boolean;
  celery?: {
    worker_active?: boolean;
    nightly_auto_apply_beat_enabled?: boolean;
    beat_schedule_has_nightly?: boolean;
  };
};

export default function StatusPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<MvpStats | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [statsRes, healthRes] = await Promise.all([
          fetch("/api/v1/public/mvp-stats", { cache: "no-store" }),
          fetch("/api/public-health", { cache: "no-store" }),
        ]);
        if (!statsRes.ok || !healthRes.ok) throw new Error("upstream");
        const statsJson = (await statsRes.json()) as MvpStats;
        const healthJson = (await healthRes.json()) as HealthPayload;
        if (!cancelled) {
          setStats(statsJson);
          setHealth(healthJson);
        }
      } catch {
        if (!cancelled) setErr(t("status.loadFailed"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const dbOk = health?.db_ok ?? stats?.database_reachable;
  const mailOk = health?.mail_configured ?? stats?.mail_configured;
  const googleOk = health?.google_calendar_configured ?? stats?.google_calendar_configured;
  const microsoftOk = health?.microsoft_calendar_configured ?? stats?.microsoft_calendar_configured;
  const stripeOk = health?.stripe_checkout_ready ?? stats?.stripe_checkout_ready;
  const linkedinOk = stats?.linkedin_oauth_configured;
  const workerOk = health?.celery?.worker_active;
  const beatOk = health?.scrape_beat_enabled && health?.celery?.beat_schedule_has_nightly;
  const scrapeReady = health?.scrape_worker_ready;
  const partnerExportOk = health?.partner_export_configured;
  const inboxOk = health?.recruiter_inbox_configured;

  return (
    <Shell wide>
      <MarketingPageSurface wide>
        <MarketingPageHeader title={t("status.title")} lead={t("status.lead")} />
        <Card className="mt-8">
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          {!err && (!stats || !health) ? <p className="twin-muted text-sm">{t("status.loading")}</p> : null}
          {stats && health ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <Row label={t("status.api")} value={health.status} ok={health.status === "ok"} />
              <Row label={t("status.database")} value={dbOk ? t("status.up") : t("status.down")} ok={!!dbOk} />
              <Row
                label={t("status.mail")}
                value={mailOk ? t("status.configured") : t("status.notConfigured")}
                ok={!!mailOk}
              />
              <Row
                label={t("status.linkedin")}
                value={linkedinOk ? t("status.configured") : t("status.notConfigured")}
                ok={!!linkedinOk}
              />
              <Row
                label={t("status.calendar")}
                value={googleOk ? t("status.configured") : t("status.notConfigured")}
                ok={!!googleOk}
              />
              <Row
                label={t("status.microsoftCalendar")}
                value={microsoftOk ? t("status.configured") : t("status.notConfigured")}
                ok={!!microsoftOk}
              />
              <Row
                label={t("status.stripe")}
                value={stripeOk ? t("status.configured") : t("status.notConfigured")}
                ok={!!stripeOk}
              />
              <Row
                label={t("status.celeryWorker")}
                value={workerOk ? t("status.active") : t("status.inactive")}
                ok={!!workerOk}
              />
              <Row
                label={t("status.scrapeWorkerReady")}
                value={scrapeReady ? t("status.configured") : t("status.notConfigured")}
                ok={!!scrapeReady}
              />
              <Row
                label={t("status.nightlyBeat")}
                value={beatOk ? t("status.scheduled") : t("status.notScheduled")}
                ok={!!beatOk}
              />
              <Row
                label={t("status.recruiterInbox")}
                value={inboxOk ? t("status.configured") : t("status.notConfigured")}
                ok={!!inboxOk}
              />
              <Row
                label={t("status.partnerExport")}
                value={partnerExportOk ? t("status.configured") : t("status.notConfigured")}
                ok={!!partnerExportOk}
              />
              <Row label={t("status.validatedJobs")} value={String(stats.validated_jobs)} ok={stats.validated_jobs > 0} />
              <Row
                label={t("status.marketCoverage")}
                value={
                  health.market_coverage_progress_pct != null
                    ? `${health.market_coverage_progress_pct}% → 10k`
                    : t("status.unknown")
                }
                ok={!health.market_coverage_feed_stale}
              />
              <Row
                label={t("status.marketLastScrape")}
                value={health.market_coverage_last_scrape_at ?? t("status.unknown")}
                ok={!health.market_coverage_feed_stale}
              />
              <Row label={t("status.git")} value={health.git_commit ?? "unknown"} ok />
            </dl>
          ) : null}
          {stats && stats.validated_jobs === 0 ? (
            <p className="twin-muted mt-4 text-sm leading-relaxed">{t("status.scrapeOpsZeroHint")}</p>
          ) : null}
          <p className="twin-muted mt-6 text-xs">{stats ? `${t("status.generated")} ${stats.generated_at}` : null}</p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/" className="twin-link">
              {t("status.home")}
            </Link>
            <a href="/api/openapi" className="twin-link" target="_blank" rel="noopener noreferrer">
              {t("status.openapi")}
            </a>
            <Link href="/developers" className="twin-link">
              {t("status.developers")}
            </Link>
          </div>
        </Card>
      </MarketingPageSurface>
    </Shell>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--twin-border)] bg-[var(--twin-surface-raised)]/60 px-4 py-3">
      <dt className="text-sm font-medium text-[var(--foreground)]">{label}</dt>
      <dd className={`text-sm font-mono tabular-nums ${ok ? "text-[var(--twin-accent)]" : "text-amber-400"}`}>{value}</dd>
    </div>
  );
}
