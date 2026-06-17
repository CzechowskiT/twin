"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import { COMPANY_BILLING_ROUTE } from "@/lib/company-billing-readiness";
import { COMPANY_HIRING_ROUTE } from "@/lib/company-hiring-dashboard";
import { COMPANY_HIRING_COCKPIT_ROUTE } from "@/lib/company-hiring-cockpit";
import { COMPANY_INTEGRATIONS_ROUTE } from "@/lib/company-integrations-readiness";
import { COMPANY_TEAM_ROUTE } from "@/lib/company-team-permissions";
import { COMPANY_TALENT_POOL_ROUTE } from "@/lib/company-talent-pool";

const NAV = [
  { href: COMPANY_HIRING_ROUTE, ns: "companyHiring" as const, key: "navDashboard" },
  { href: COMPANY_HIRING_COCKPIT_ROUTE, ns: "companyHiringCockpit" as const, key: "navLink" },
  { href: COMPANY_INTEGRATIONS_ROUTE, ns: "companyIntegrations" as const, key: "navLink" },
  { href: COMPANY_BILLING_ROUTE, ns: "companyBilling" as const, key: "navBilling" },
  { href: COMPANY_ROLES_ROUTE, ns: "companyJobs" as const, key: "navRoles" },
  { href: "/company/pipeline", ns: "companyPipeline" as const, key: "navLink" },
  { href: COMPANY_TALENT_POOL_ROUTE, ns: "companyTalentPool" as const, key: "navLink" },
  { href: COMPANY_TEAM_ROUTE, ns: "companyTeam" as const, key: "navTeam" },
  { href: "/calculator/b2b", ns: "companyTeam" as const, key: "navCalculator" },
  { href: "/recruiter/inbox", ns: "companyJobs" as const, key: "navInbox" },
  { href: "/for-companies", ns: "companyJobs" as const, key: "navForCompanies" },
] as const;

export function CompanyWorkspaceNav() {
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 flex flex-wrap gap-2 border-b border-[var(--twin-border)] pb-4"
      aria-label={t("companyJobs.navAria")}
    >
      {NAV.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/for-companies" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "rounded-full bg-[var(--twin-accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--twin-accent)]"
                : "rounded-full px-3 py-1.5 text-sm text-[var(--twin-muted-strong)] hover:bg-[var(--twin-surface-soft)]"
            }
          >
            {t(`${item.ns}.${item.key}` as TranslationKey)}
          </Link>
        );
      })}
    </nav>
  );
}
