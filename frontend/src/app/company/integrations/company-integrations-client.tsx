"use client";

import Link from "next/link";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { IntegrationRowStatusBadge } from "@/components/workspace/integration-row-status-badge";
import { WorkspacePilotPageHeader } from "@/components/workspace/workspace-pilot-page-header";
import type { TranslationKey } from "@/lib/i18n";
import { Shell } from "@/components/ui";
import { COMPANY_INTEGRATION_ROWS } from "@/lib/company-integrations-readiness";

const LABEL_KEYS: Record<string, TranslationKey> = {
  acceptance_inbox: "companyIntegrations.item_acceptance_inbox",
  talent_pool_import: "companyIntegrations.item_talent_pool_import",
  ats_webhooks: "companyIntegrations.item_ats_webhooks",
  employer_calendar: "companyIntegrations.item_employer_calendar",
  employer_billing: "companyIntegrations.item_employer_billing",
  team_tokens: "companyIntegrations.item_team_tokens",
  greenhouse_webhook: "companyIntegrations.item_greenhouse_webhook",
};

export default function CompanyIntegrationsClient() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <CompanyWorkspaceNav />
      <WorkspacePilotPageHeader
        eyebrowKey="companyIntegrations.eyebrow"
        titleKey="companyIntegrations.title"
        leadKey="companyIntegrations.lead"
        status="pilot"
      />

      <ul className="space-y-3">
        {COMPANY_INTEGRATION_ROWS.map((row) => {
          const label = t(LABEL_KEYS[row.id] ?? LABEL_KEYS.acceptance_inbox);
          const inner = (
            <>
              <span className="font-medium text-[var(--foreground)]">{label}</span>
              <IntegrationRowStatusBadge status={row.status} />
            </>
          );
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--twin-border)]/80 px-4 py-3 text-sm"
            >
              {row.href ? (
                <Link href={row.href} className="flex w-full flex-wrap items-center justify-between gap-2 twin-link">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>

      <p className="twin-muted mt-8 text-xs leading-relaxed">{t("companyIntegrations.scopeNote")}</p>
      <p className="mt-4 text-sm">
        <Link href="/company/talent-pool" className="twin-link font-medium">
          {t("companyTalentPool.navLink")}
        </Link>
      </p>
    </Shell>
  );
}
