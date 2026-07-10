"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { COMPANY_BILLING_ROUTE } from "@/lib/company-billing-readiness";
import { COMPANY_HIRING_ROUTE } from "@/lib/company-hiring-dashboard";
import { COMPANY_HIRING_COCKPIT_ROUTE } from "@/lib/company-hiring-cockpit";
import { COMPANY_HIRING_COMMAND_CENTER_ROUTE } from "@/lib/company-hiring-command-center";
import { COMPANY_INTEGRATIONS_ROUTE } from "@/lib/company-integrations-readiness";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import { COMPANY_TEAM_ROUTE } from "@/lib/company-team-permissions";
import { COMPANY_TALENT_POOL_ROUTE } from "@/lib/company-talent-pool";
import {
  COMPANY_PRIMARY_NAV_HREFS,
  COMPANY_WORKSPACE_NAV_COLLAPSED_DEFAULT,
  HIDE_COMPANY_BILLING_FROM_NAV,
  HIDE_COMPANY_INTEGRATIONS_FROM_NAV,
} from "@/lib/seven-day-d4-company";

type NavTab = { href: string; labelKey: TranslationKey };

const PRIMARY_TABS: NavTab[] = [
  { href: COMPANY_HIRING_ROUTE, labelKey: "companyHiring.navDashboard" },
  { href: COMPANY_ROLES_ROUTE, labelKey: "companyJobs.navRoles" },
  { href: "/company/pipeline", labelKey: "companyPipeline.navLink" },
  { href: COMPANY_TALENT_POOL_ROUTE, labelKey: "companyTalentPool.navLink" },
];

const EXTENDED_TABS: NavTab[] = [
  { href: COMPANY_HIRING_COCKPIT_ROUTE, labelKey: "companyHiringCockpit.navLink" },
  { href: COMPANY_HIRING_COMMAND_CENTER_ROUTE, labelKey: "companyHiringCommandCenter.navLink" },
  { href: COMPANY_TEAM_ROUTE, labelKey: "companyTeam.navTeam" },
  { href: "/calculator/b2b", labelKey: "companyTeam.navCalculator" },
  { href: "/recruiter/inbox", labelKey: "companyJobs.navInbox" },
  { href: "/for-companies", labelKey: "companyJobs.navForCompanies" },
];

function isPrimaryHref(href: string): boolean {
  return (COMPANY_PRIMARY_NAV_HREFS as readonly string[]).includes(href);
}

function NavLink({ tab, pathname }: { tab: NavTab; pathname: string }) {
  const { t } = useTranslation();
  const active = pathname === tab.href || (tab.href !== "/for-companies" && pathname.startsWith(`${tab.href}/`));

  return (
    <Link
      href={tab.href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--twin-accent-soft)] text-[var(--twin-accent)]"
          : "text-[var(--twin-muted-strong)] hover:bg-[var(--twin-surface-soft)]"
      }`}
      aria-current={active ? "page" : undefined}
      data-company-nav-tier={isPrimaryHref(tab.href) ? "primary" : "extended"}
    >
      {t(tab.labelKey)}
    </Link>
  );
}

export function CompanyWorkspaceNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!COMPANY_WORKSPACE_NAV_COLLAPSED_DEFAULT);

  const extendedTabs = (HIDE_COMPANY_BILLING_FROM_NAV
    ? EXTENDED_TABS
    : [...EXTENDED_TABS, { href: COMPANY_BILLING_ROUTE, labelKey: "companyBilling.navBilling" as TranslationKey }]
  ).filter((tab) => !HIDE_COMPANY_INTEGRATIONS_FROM_NAV || tab.href !== COMPANY_INTEGRATIONS_ROUTE);

  return (
    <nav
      className="mb-6 border-b border-[var(--twin-border)] pb-4"
      aria-label={t("companyJobs.navAria")}
      data-seven-day-company-workspace-nav
    >
      <div className="flex flex-wrap gap-2" data-company-nav-primary>
        {PRIMARY_TABS.map((tab) => (
          <NavLink key={tab.href} tab={tab} pathname={pathname} />
        ))}
      </div>
      {expanded ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--twin-border)]/60 pt-3" data-company-nav-extended>
          {extendedTabs.map((tab) => (
            <NavLink key={tab.href} tab={tab} pathname={pathname} />
          ))}
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
          data-company-nav-extended-toggle
        >
          {t("productPolish.companyExtendedNavToggle")}
        </button>
      )}
    </nav>
  );
}
