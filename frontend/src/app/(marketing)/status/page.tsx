"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "@/components/language-provider";
import { Card, Shell } from "@/components/ui";

type MvpStats = {
  validated_jobs: number;
  database_reachable: boolean;
  mail_configured: boolean;
  google_calendar_configured: boolean;
  microsoft_calendar_configured: boolean;
  stripe_checkout_ready: boolean;
  generated_at: string;
};

type HealthPayload = {
  status: string;
  db_ok?: boolean;
  git_commit?: string;
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

  return (
    <Shell wide>
      <Card>
        <h1 className="mb-2 text-2xl font-semibold">{t("status.title")}</h1>
        <p className="twin-muted mb-6 text-sm leading-relaxed">{t("status.lead")}</p>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        {!err && (!stats || !health) ? (
          <p className="twin-muted text-sm">{t("status.loading")}</p>
        ) : null}
        {stats && health ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Row label={t("status.api")} value={health.status} ok={health.status === "ok"} />
            <Row label={t("status.database")} value={dbOk ? t("status.up") : t("status.down")} ok={!!dbOk} />
            <Row
              label={t("status.mail")}
              value={stats.mail_configured ? t("status.configured") : t("status.notConfigured")}
              ok={stats.mail_configured}
            />
            <Row
              label={t("status.calendar")}
              value={stats.google_calendar_configured ? t("status.configured") : t("status.notConfigured")}
              ok={stats.google_calendar_configured}
            />
            <Row
              label={t("status.microsoftCalendar")}
              value={stats.microsoft_calendar_configured ? t("status.configured") : t("status.notConfigured")}
              ok={stats.microsoft_calendar_configured}
            />
            <Row
              label={t("status.stripe")}
              value={stats.stripe_checkout_ready ? t("status.configured") : t("status.notConfigured")}
              ok={stats.stripe_checkout_ready}
            />
            <Row label={t("status.validatedJobs")} value={String(stats.validated_jobs)} ok={stats.validated_jobs > 0} />
            <Row label={t("status.git")} value={health.git_commit ?? "unknown"} ok />
          </dl>
        ) : null}
        <p className="twin-muted mt-6 text-xs">
          {stats ? `${t("status.generated")} ${stats.generated_at}` : null}
        </p>
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
    </Shell>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--twin-border)] px-4 py-3">
      <dt className="text-sm font-medium">{label}</dt>
      <dd className={`text-sm font-mono tabular-nums ${ok ? "text-emerald-600" : "text-amber-700"}`}>{value}</dd>
    </div>
  );
}
