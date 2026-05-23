"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { ButtonCta } from "@/components/ui";
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
};

/** Welcome + one primary CTA; secondary shortcuts in a disclosure (stats stay in the left rail). */
export function DashboardCommandCenter({
  email,
  profileName,
  hasProfile,
  showScrapeUi,
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
  actions.push({ href: "/dashboard/referrals", label: t("dashboard.quickReferrals") });
  if (showScrapeUi) {
    actions.push({ href: "#dashboard-scrape", label: t("dashboard.quickRefreshListings") });
  }

  const primaryHref = hasProfile ? "#dashboard-matches" : "/profile";
  const primaryLabel = hasProfile ? t("dashboard.statMatchesCta") : t("dashboard.setupProfile");

  return (
    <div className="mb-4 sm:mb-6">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--twin-muted)]">
        {t("dashboard.northStarEyebrow")}
      </p>
      <h2 className="twin-page-intro twin-section-title mt-1 text-xl sm:text-2xl">{welcome}</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--twin-muted)]">{t("dashboard.welcomePrompt")}</p>
      <div className="mt-4">
        {primaryHref.startsWith("#") ? (
          <a href={primaryHref} onClick={scrollToDashboardHash} className="inline-block">
            <ButtonCta type="button" className="!w-auto">
              {primaryLabel}
            </ButtonCta>
          </a>
        ) : (
          <Link href={primaryHref} className="inline-block">
            <ButtonCta type="button" className="!w-auto">
              {primaryLabel}
            </ButtonCta>
          </Link>
        )}
      </div>
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
