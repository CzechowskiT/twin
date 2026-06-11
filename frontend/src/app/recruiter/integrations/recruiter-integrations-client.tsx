"use client";

import Link from "next/link";

import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import { Shell } from "@/components/ui";
import {
  RECRUITER_INTEGRATION_ROWS,
  RECRUITER_INTEGRATIONS_ROUTE,
} from "@/lib/recruiter-integrations-readiness";

const LABEL_KEYS: Record<string, TranslationKey> = {
  acceptance_inbox: "recruiterIntegrations.item_acceptance_inbox",
  ats_oauth: "recruiterIntegrations.item_ats_oauth",
  calendar_sync: "recruiterIntegrations.item_calendar_sync",
  teams_meet: "recruiterIntegrations.item_teams_meet",
  greenhouse_webhook: "recruiterIntegrations.item_greenhouse_webhook",
  lever_webhook: "recruiterIntegrations.item_lever_webhook",
};

const STATUS_KEYS: Record<string, TranslationKey> = {
  live: "recruiterIntegrations.status_live",
  pilot: "recruiterIntegrations.status_pilot",
  planned: "recruiterIntegrations.status_planned",
  not_live: "recruiterIntegrations.status_not_live",
};

export default function RecruiterIntegrationsClient() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <RecruiterWorkspaceNav />
      <header className="mb-8 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--twin-accent)]">
          {t("recruiterIntegrations.eyebrow")}
        </p>
        <h1 className="twin-page-intro text-2xl font-semibold sm:text-3xl">{t("recruiterIntegrations.title")}</h1>
        <p className="twin-muted max-w-2xl text-sm leading-relaxed">{t("recruiterIntegrations.lead")}</p>
      </header>

      <ul className="space-y-3">
        {RECRUITER_INTEGRATION_ROWS.map((row) => {
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

      <p className="twin-muted mt-8 text-xs leading-relaxed">{t("recruiterIntegrations.scopeNote")}</p>
    </Shell>
  );
}
