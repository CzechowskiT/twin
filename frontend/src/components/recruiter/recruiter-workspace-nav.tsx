"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import {
  HIDE_RECRUITER_CALENDAR_FROM_NAV,
  HIDE_RECRUITER_INTEGRATIONS_FROM_NAV,
  RECRUITER_PRIMARY_NAV_HREFS,
  RECRUITER_WORKSPACE_NAV_COLLAPSED_DEFAULT,
} from "@/lib/seven-day-d3-recruiter";

type NavTab = { href: string; labelKey: TranslationKey };

const PRIMARY_TABS: NavTab[] = [
  { href: "/recruiter/inbox", labelKey: "recruiterInbox.title" },
  { href: "/recruiter/pipeline", labelKey: "recruiterPipeline.title" },
  { href: "/recruiter/jobs", labelKey: "recruiterJobs.title" },
  { href: "/recruiter/search", labelKey: "recruiterSearch.title" },
  { href: "/recruiter/analytics", labelKey: "recruiterAnalytics.title" },
];

const EXTENDED_TABS: NavTab[] = [
  { href: "/recruiter/daily-cockpit", labelKey: "recruiterDailyCockpit.navLink" },
  { href: "/recruiter/trust-review-queue", labelKey: "recruiterTrustReviewQueue.navLink" },
  { href: "/recruiter/talent-radar", labelKey: "recruiterTalentRadar.navLink" },
  { href: "/recruiter/talent-pool", labelKey: "recruiterTalentPool.title" },
  { href: "/recruiter/talent-radar/digest", labelKey: "recruiterTalentRadarDigest.navLink" },
  { href: "/recruiter/integrations", labelKey: "recruiterIntegrations.title" },
];

function isPrimaryHref(href: string): boolean {
  return (RECRUITER_PRIMARY_NAV_HREFS as readonly string[]).includes(href);
}

function NavLink({ tab, pathname }: { tab: NavTab; pathname: string }) {
  const { t } = useTranslation();
  const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

  return (
    <Link
      href={tab.href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--twin-surface-raised)] text-[var(--foreground)] ring-1 ring-[var(--twin-border)]"
          : "text-[var(--twin-muted-strong)] hover:bg-[var(--twin-surface-raised)] hover:text-[var(--foreground)]"
      }`}
      aria-current={active ? "page" : undefined}
      data-recruiter-nav-tier={isPrimaryHref(tab.href) ? "primary" : "extended"}
    >
      {t(tab.labelKey)}
    </Link>
  );
}

export function RecruiterWorkspaceNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!RECRUITER_WORKSPACE_NAV_COLLAPSED_DEFAULT);

  return (
    <nav
      className="recruiter-workspace-nav mb-6 border-b border-[var(--twin-border)] pb-3"
      aria-label={t("recruiterPipeline.navAria")}
      data-seven-day-recruiter-workspace-nav
    >
      <div className="flex flex-wrap gap-2" data-recruiter-nav-primary>
        {PRIMARY_TABS.map((tab) => (
          <NavLink key={tab.href} tab={tab} pathname={pathname} />
        ))}
      </div>
      {expanded ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--twin-border)]/60 pt-3" data-recruiter-nav-extended>
          {EXTENDED_TABS.filter(
            (tab) => !HIDE_RECRUITER_INTEGRATIONS_FROM_NAV || tab.href !== "/recruiter/integrations",
          ).map((tab) => (
            <NavLink key={tab.href} tab={tab} pathname={pathname} />
          ))}
          {!HIDE_RECRUITER_CALENDAR_FROM_NAV ? (
            <NavLink tab={{ href: "/recruiter/calendar", labelKey: "recruiterCalendar.title" }} pathname={pathname} />
          ) : null}
          <button
            type="button"
            className="twin-link px-3 py-1.5 text-sm font-semibold"
            onClick={() => setExpanded(false)}
            aria-expanded={expanded}
          >
            {t("workspaceModules.showFewerModules")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="twin-link mt-3 text-sm font-semibold"
          onClick={() => setExpanded(true)}
          aria-expanded={expanded}
          data-recruiter-nav-extended-toggle
        >
          {t("productPolish.recruiterExtendedNavToggle")}
        </button>
      )}
    </nav>
  );
}
