"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { ButtonCta } from "@/components/ui";
import { scrollToDashboardHash } from "@/lib/dashboard-anchor";

import { DashboardTodayHero } from "@/components/dashboard/dashboard-today-hero";
import { DemoSampleBadge } from "@/components/marketing/demo-sample-badge";
import type { DashboardTodayContext } from "@/lib/dashboard-next-best-action";
import { isDemoUserEmail } from "@/lib/demo-user";

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
  todayContext: DashboardTodayContext;
};

/** Welcome + one primary CTA; secondary shortcuts in a disclosure (stats stay in the left rail). */
export function DashboardCommandCenter({
  email,
  profileName,
  hasProfile,
  showScrapeUi,
  todayContext,
}: DashboardCommandCenterProps) {
  const { t } = useTranslation();
  const name = displayName(email, profileName);
  const welcome = name ? t("dashboard.welcomeBackNamed").replace("{name}", name) : t("dashboard.welcomeBack");
  const showDemoHero = isDemoUserEmail(email);

  const actions: { href: string; label: string }[] = [
    { href: "/demo", label: t("nav.demo") },
    { href: "#dashboard-jobs", label: t("dashboard.quickBrowseFeed") },
    { href: "/profile", label: t("dashboard.quickUpdateProfile") },
  ];
  if (hasProfile) {
    actions.push({ href: "#dashboard-matches", label: t("dashboard.quickTopMatches") });
    actions.push({ href: "#dashboard-applications", label: t("dashboard.quickApplications") });
  }
  actions.push({ href: "/onboarding-assistant", label: t("dashboard.quickWorkspaceTour") });
  actions.push({ href: "/dashboard/referrals", label: t("dashboard.quickReferrals") });
  if (showScrapeUi) {
    actions.push({ href: "#dashboard-scrape", label: t("dashboard.quickRefreshListings") });
  }

  return (
    <div className="mb-4 sm:mb-6">
      <DashboardTodayHero welcomeTitle={welcome} todayContext={todayContext} />
      {showDemoHero ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--twin-accent)]/35 bg-[var(--twin-accent-muted)]/35 px-4 py-3">
          {isDemoUserEmail(email) ? <DemoSampleBadge className="self-start" /> : null}
          <Link href="/demo" className="inline-block shrink-0">
            <ButtonCta type="button" className={`!w-auto${isDemoUserEmail(email) ? " twin-header-cta--demo-pulse" : ""}`}>
              {t("nav.demo")}
            </ButtonCta>
          </Link>
          <p className="max-w-md text-xs leading-relaxed text-[var(--twin-muted-strong)]">{t("dashboard.demoHeroHint")}</p>
        </div>
      ) : null}
      <details className="mt-4 max-w-prose">
        <summary className="twin-link twin-touch-target inline-flex min-h-[2.75rem] cursor-pointer list-none items-center text-sm font-medium [&::-webkit-details-marker]:hidden">
          {t("dashboard.quickMoreActions")}
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {actions.map((a) =>
            a.href.startsWith("#") ? (
              <a
                key={a.href + a.label}
                href={a.href}
                onClick={scrollToDashboardHash}
                className="twin-btn-secondary twin-touch-target !w-auto px-3 py-2 text-xs"
              >
                {a.label}
              </a>
            ) : (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="twin-btn-secondary twin-touch-target !w-auto px-3 py-2 text-xs"
              >
                {a.label}
              </Link>
            ),
          )}
        </div>
      </details>
    </div>
  );
}
