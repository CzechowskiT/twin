"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { scrollToDashboardHash } from "@/lib/dashboard-anchor";

function displayName(email: string | undefined, profileName: string | undefined): string {
  const trimmed = profileName?.trim();
  if (trimmed) return trimmed;
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  if (!local) return "";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

type DashboardCommandCenterProps = {
  email: string | undefined;
  profileName: string | undefined;
  hasProfile: boolean;
  showScrapeUi: boolean;
  jobsTotal: number;
  matchesVisible: number;
  applicationsActive: number;
};

/** Inspired by executive career hubs: welcome, quick actions, and at-a-glance pipeline counts. */
export function DashboardCommandCenter({
  email,
  profileName,
  hasProfile,
  showScrapeUi,
  jobsTotal,
  matchesVisible,
  applicationsActive,
}: DashboardCommandCenterProps) {
  const { t } = useTranslation();
  const name = displayName(email, profileName);
  const welcome = name ? t("dashboard.welcomeBackNamed").replace("{name}", name) : t("dashboard.welcomeBack");

  const actions: { href: string; label: string }[] = [
    { href: "#dashboard-jobs", label: t("dashboard.quickBrowseFeed") },
    { href: "/profile", label: t("dashboard.quickUpdateProfile") },
  ];
  if (hasProfile) {
    actions.push({ href: "#dashboard-matches", label: t("dashboard.quickTopMatches") });
    actions.push({ href: "#dashboard-applications", label: t("dashboard.quickApplications") });
  }
  actions.push({ href: "/onboarding-assistant", label: t("dashboard.quickWorkspaceTour") });
  actions.push({ href: "/for-candidates#growth-post-offer", label: t("dashboard.quickGrowthPostOffer") });
  if (showScrapeUi) {
    actions.push({ href: "#dashboard-scrape", label: t("dashboard.quickRefreshListings") });
  }

  return (
    <div className="mb-4 sm:mb-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">{welcome}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--twin-muted)] sm:text-base">
          {t("dashboard.welcomePrompt")}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="twin-card-inset rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.statFeedTitle")}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--twin-link)]">{jobsTotal}</p>
          <a
            href="#dashboard-jobs"
            onClick={scrollToDashboardHash}
            className="twin-link mt-2 inline-block text-sm font-medium"
          >
            {t("dashboard.statFeedCta")}
          </a>
        </div>
        <div className="twin-card-inset rounded-xl border border-[var(--twin-border)] bg-gradient-to-br from-[var(--twin-accent-muted)] to-[var(--twin-card)] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.statMatchesTitle")}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--twin-accent)]">{hasProfile ? matchesVisible : "—"}</p>
          {hasProfile ? (
            <a
              href="#dashboard-matches"
              onClick={scrollToDashboardHash}
              className="twin-link mt-2 inline-block text-sm font-medium"
            >
              {t("dashboard.statMatchesCta")}
            </a>
          ) : (
            <Link href="/profile" className="twin-link mt-2 inline-block text-sm font-medium">
              {t("dashboard.statMatchesSetup")}
            </Link>
          )}
        </div>
        <div className="twin-card-inset rounded-xl border border-[var(--twin-border)] bg-[var(--twin-card)] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--twin-muted)]">
            {t("dashboard.statPipelineTitle")}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--twin-cta)]">{hasProfile ? applicationsActive : "—"}</p>
          {hasProfile ? (
            <a
              href="#dashboard-applications"
              onClick={scrollToDashboardHash}
              className="twin-link mt-2 inline-block text-sm font-medium"
            >
              {t("dashboard.statPipelineCta")}
            </a>
          ) : (
            <Link href="/profile" className="twin-link mt-2 inline-block text-sm font-medium">
              {t("dashboard.statPipelineHint")}
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions.map((a) =>
          a.href.startsWith("#") ? (
            <a
              key={a.href + a.label}
              href={a.href}
              onClick={scrollToDashboardHash}
              className="twin-touch-target inline-flex items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-4 py-2 text-sm font-medium text-[var(--twin-muted-strong)] shadow-sm transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)]"
            >
              {a.label}
            </a>
          ) : (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="twin-touch-target inline-flex items-center justify-center rounded-full border border-[var(--twin-border)] bg-[var(--twin-surface-raised)] px-4 py-2 text-sm font-medium text-[var(--twin-muted-strong)] shadow-sm transition hover:border-[var(--twin-border-hover)] hover:bg-[var(--twin-accent-muted)]"
            >
              {a.label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
