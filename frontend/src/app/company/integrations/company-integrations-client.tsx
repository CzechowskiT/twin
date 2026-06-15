"use client";

import Link from "next/link";

import { CompanyWorkspaceNav } from "@/components/company/company-workspace-nav";
import { useTranslation } from "@/components/language-provider";
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

const STATUS_KEYS: Record<string, TranslationKey> = {
  live: "companyIntegrations.status_live",
  pilot: "companyIntegrations.status_pilot",
  planned: "companyIntegrations.status_planned",
  not_live: "companyIntegrations.status_not_live",
};

export default function CompanyIntegrationsClient() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <CompanyWorkspaceNav />
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("companyIntegrations.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("companyIntegrations.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("companyIntegrations.lead")}</p>
      </header>

      <ul className="space-y-3">
        {COMPANY_INTEGRATION_ROWS.map((row) => {
          const label = t(LABEL_KEYS[row.id] ?? LABEL_KEYS.acceptance_inbox);
          const status = t(STATUS_KEYS[row.status] ?? STATUS_KEYS.not_live);
          const inner = (
            <>
              <span className="font-medium text-[var(--foreground)]">{label}</span>
              <span className="rounded-full bg-[var(--twin-surface-soft)] px-2 py-0.5 text-xs font-medium">{status}</span>
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
