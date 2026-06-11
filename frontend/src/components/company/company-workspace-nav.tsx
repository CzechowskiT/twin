"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslation } from "@/components/language-provider";

const TABS = [
  { href: "/company/billing", labelKey: "companyBilling.navBilling" as const },
  { href: "/calculator/b2b", labelKey: "companyBilling.navCalculator" as const },
  { href: "/for-companies", labelKey: "companyBilling.navStory" as const },
] as const;

export function CompanyWorkspaceNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const path = pathname?.split("?")[0] ?? "";

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-[var(--border)] pb-4" aria-label={t("companyBilling.navAria")}>
      {TABS.map((tab) => {
        const active = path === tab.href || path.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--twin-accent)] text-[var(--background)]"
                : "text-[var(--foreground)] hover:bg-[var(--muted)]"
            }`}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
