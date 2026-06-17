"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { useTranslation } from "@/components/language-provider";
import { useMarketingPersona } from "@/components/persona-provider";
import { scrollToDashboardHash } from "@/lib/dashboard-anchor";
import { getToken } from "@/lib/auth";
import type { TranslationKey } from "@/lib/i18n";
import { JOB_FEED_ACTIVE_DAYS } from "@/lib/jobs";
import { momentumRailCtas } from "@/lib/persona-access";

const FEED_COVERAGE_TARGET = 10_000;

const TIPS = [
  "site.momentumTip1",
  "site.momentumTip2",
  "site.momentumTip3",
  "site.momentumTip4",
  "site.momentumTip5",
  "site.momentumTip6",
] as const satisfies readonly TranslationKey[];

function tipIndex(pathname: string, offset: number): number {
  let h = offset * 31;
  for (let i = 0; i < pathname.length; i++) {
    h = (h + pathname.charCodeAt(i) * (i + 1)) % 997;
  }
  return h % TIPS.length;
}

export type DashboardMomentumStats = {
  jobsTotal: number;
  matchesTotal: number | null;
  matchesVisible: number;
  applicationsTotal: number;
  pipelineActive: number;
  hasProfile: boolean;
};

function DashboardSnapshot({
  stats,
  t,
}: {
  stats: DashboardMomentumStats;
  t: (key: TranslationKey) => string;
}) {
  const matchesCaption =
    stats.hasProfile && stats.matchesTotal != null && stats.matchesVisible !== stats.matchesTotal
      ? t("dashboard.railMatchesShownOfTotal")
          .replace("{visible}", String(stats.matchesVisible))
          .replace("{total}", String(stats.matchesTotal))
      : null;

  return (
    <div className="mb-4 border-b border-[var(--twin-border)] pb-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
        {t("dashboard.railSnapshotEyebrow")}
      </p>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.statFeedTitle")}
          </dt>
          <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-[var(--twin-link)]">{stats.jobsTotal}</dd>
          {stats.jobsTotal < FEED_COVERAGE_TARGET ? (
            <p className="twin-muted mt-0.5 text-xs">
              {t("dashboard.statFeedGoal")
                .replace("{target}", String(FEED_COVERAGE_TARGET))
                .replace("{days}", String(JOB_FEED_ACTIVE_DAYS))}
            </p>
          ) : null}
          <a href="#dashboard-jobs" onClick={scrollToDashboardHash} className="twin-link mt-1 inline-block text-xs font-medium">
            {t("dashboard.statFeedCta")}
          </a>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.statMatchesTitle")}
          </dt>
          <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-[var(--twin-accent)]">
            {stats.hasProfile ? stats.matchesVisible : "—"}
          </dd>
          {matchesCaption ? <p className="twin-muted mt-0.5 text-xs">{matchesCaption}</p> : null}
          {stats.hasProfile ? (
            <a
              href="#dashboard-matches"
              onClick={scrollToDashboardHash}
              className="twin-link mt-1 inline-block text-xs font-medium"
            >
              {t("dashboard.statMatchesCta")}
            </a>
          ) : (
            <Link href="/profile" className="twin-link mt-1 inline-block text-xs font-medium">
              {t("dashboard.statMatchesSetup")}
            </Link>
          )}
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.statApplicationsTitle")}
          </dt>
          <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            {stats.hasProfile ? stats.applicationsTotal : "—"}
          </dd>
          {stats.hasProfile ? (
            <a
              href="#dashboard-applications"
              onClick={scrollToDashboardHash}
              className="twin-link mt-1 inline-block text-xs font-medium"
            >
              {t("dashboard.statApplicationsCta")}
            </a>
          ) : (
            <Link href="/profile" className="twin-link mt-1 inline-block text-xs font-medium">
              {t("dashboard.statPipelineHint")}
            </Link>
          )}
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.statPipelineTitle")}
          </dt>
          <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-[var(--twin-cta)]">
            {stats.hasProfile ? stats.pipelineActive : "—"}
          </dd>
          {stats.hasProfile ? (
            <a
              href="#dashboard-applications"
              onClick={scrollToDashboardHash}
              className="twin-link mt-1 inline-block text-xs font-medium"
            >
              {t("dashboard.statPipelineCta")}
            </a>
          ) : null}
        </div>
      </dl>
    </div>
  );
}

export function PageMomentumRail({
  variant = "app",
  className = "",
  dashboardStats,
}: {
  variant?: "app" | "marketing";
  className?: string;
  dashboardStats?: DashboardMomentumStats | null;
}) {
  const pathname = usePathname() ?? "";
  const { t } = useTranslation();
  const { persona } = useMarketingPersona();
  const hasSession = Boolean(getToken());

  const primaryTip = useMemo(() => TIPS[tipIndex(pathname, 0)], [pathname]);
  const secondaryTip = useMemo(() => TIPS[tipIndex(pathname, 1)], [pathname]);
  const ctas = useMemo(
    () => momentumRailCtas(pathname, variant, persona, hasSession),
    [pathname, variant, persona, hasSession],
  );

  const shell =
    variant === "marketing"
      ? "border-[var(--twin-border)]/70 bg-[var(--twin-surface-raised)]/35"
      : "border-[var(--twin-border)] bg-[var(--twin-card)]/85";

  const frame =
    variant === "marketing"
      ? `mt-auto w-full shrink-0 border-t py-8 ${shell} ${className}`
      : `max-lg:mt-auto w-full shrink-0 rounded-xl border px-4 py-5 sm:px-5 sm:py-6 ${shell} ${className}`;

  return (
    <aside className={frame} aria-label={t("site.momentumAria")}>
      <div className={variant === "marketing" ? "twin-container" : ""}>
        {variant === "app" && dashboardStats ? <DashboardSnapshot stats={dashboardStats} t={t} /> : null}
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
          {t("site.momentumEyebrow")}
        </p>
        <p className="mt-1 min-w-0 break-words text-sm font-medium leading-relaxed text-[var(--twin-muted-strong)]">
          {t("site.momentumLead")}
        </p>
        <p className="mt-3 min-w-0 max-w-prose break-words text-sm leading-relaxed text-[var(--twin-muted-strong)]">
          {t(primaryTip)}
        </p>
        {secondaryTip !== primaryTip ? (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--twin-muted)]">{t(secondaryTip)}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {ctas.map((c) => (
            <Link key={`${c.href}:${c.labelKey}`} href={c.href} className="twin-link text-sm font-medium">
              {t(c.labelKey)}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
