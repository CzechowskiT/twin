"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslation } from "@/components/language-provider";
import { COMPANY_ROLES_ROUTE } from "@/lib/company-jobs-roles";
import { COMPANY_TEAM_ROUTE } from "@/lib/company-team-permissions";

const NAV = [
  { href: COMPANY_ROLES_ROUTE, ns: "companyJobs" as const, key: "navRoles" },
  { href: "/company/pipeline", ns: "companyPipeline" as const, key: "navLink" },
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
            {t(`${item.ns}.${item.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
