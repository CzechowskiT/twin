"use client";

import Link from "next/link";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { IntegrationRowStatusBadge } from "@/components/workspace/integration-row-status-badge";
import { WorkspacePilotPageHeader } from "@/components/workspace/workspace-pilot-page-header";
import type { TranslationKey } from "@/lib/i18n";
import { COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF } from "@/lib/all-workspace-green-gate";
import { Shell, Card } from "@/components/ui";
import { COMPANY_INTEGRATION_ROWS } from "@/lib/company-integrations-readiness";
import {
  COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE,
  COMPANY_INTEGRATIONS_ROADMAP_STATUS,
} from "@/lib/seven-day-d4-company";
import {
  ATS_COMING_SOON_NO_LIVE_SYNC,
  COMPANY_INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC,
  COMPANY_SCHEDULING_ROADMAP_ONLY,
} from "@/lib/seven-day-d6-integrations";

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
    <Shell wide data-seven-day-company-integrations data-seven-day-d6-company-integrations data-wave3-company-integrations-roadmap>
      <CompanyWorkspaceNav />
      <WorkspacePilotPageHeader
        eyebrowKey="companyIntegrations.eyebrow"
        titleKey="companyIntegrations.title"
        leadKey="companyIntegrations.lead"
        status={COMPANY_INTEGRATIONS_ROADMAP_STATUS}
      />
      {COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE ? (
        <p className="twin-muted mb-4 text-sm leading-relaxed" data-wave3-integrations-outside-workspace>
          {t("companyIntegrations.outsideWorkspaceNote")}
        </p>
      ) : null}
      {COMPANY_INTEGRATIONS_HONEST_NO_LIVE_ATS_SYNC ? (
        <p className="twin-muted mb-4 text-sm leading-relaxed" data-seven-day-company-integrations-roadmap-boundary>
          {t("companyIntegrations.roadmapBoundary")}
        </p>
      ) : null}
      {ATS_COMING_SOON_NO_LIVE_SYNC ? (
        <p className="twin-muted mb-4 text-sm leading-relaxed" data-seven-day-d6-integrations-boundary>
          {t("sevenDayD6.integrationsNoLiveSyncBoundary")}
        </p>
      ) : null}
      {COMPANY_SCHEDULING_ROADMAP_ONLY ? (
        <Card variant="soft" className="mb-4 border-[var(--twin-border)]/80 p-4" data-seven-day-d6-company-scheduling-boundary>
          <p className="text-sm font-semibold text-[var(--foreground)]">{t("sevenDayD6.companySchedulingComingSoonTitle")}</p>
          <p className="twin-muted mt-2 text-sm leading-relaxed">{t("sevenDayD6.companySchedulingComingSoonBody")}</p>
        </Card>
      ) : null}

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
      {COMPANY_INTEGRATIONS_MOVE_TO_ROADMAP_OUTSIDE_WORKSPACE ? (
        <p className="mt-4 text-sm">
          <Link href={COMPANY_INTEGRATIONS_ROADMAP_OUTSIDE_HREF} className="twin-link font-medium">
            {t("companyIntegrations.roadmapLink")}
          </Link>
        </p>
      ) : null}
      <p className="mt-4 text-sm">
        <Link href="/company/talent-pool" className="twin-link font-medium">
          {t("companyTalentPool.navLink")}
        </Link>
      </p>
    </Shell>
  );
}
