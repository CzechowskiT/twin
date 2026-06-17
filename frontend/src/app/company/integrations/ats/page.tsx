"use client";

import Link from "next/link";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { Shell } from "@/components/ui";
import { atsImportReadinessHref } from "@/lib/ats-import-readiness";

export default function CompanyAtsIntegrationsPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <CompanyWorkspaceNav />
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("atsImportReadiness.companyEyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("atsImportReadiness.companyTitle")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("atsImportReadiness.companyLead")}</p>
        <p className="text-sm">
          <Link
            href={atsImportReadinessHref("company")}
            className="twin-link font-medium"
            data-testid="company-ats-import-readiness-link"
          >
            {t("atsImportReadiness.openImportReadiness")}
          </Link>
        </p>
      </header>
      <p className="twin-muted text-xs leading-relaxed">{t("atsImportReadiness.companyScopeNote")}</p>
    </Shell>
  );
}
