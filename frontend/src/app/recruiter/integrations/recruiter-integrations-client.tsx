"use client";

import Link from "next/link";

import { RecruiterWorkspaceNav } from "@/components/recruiter/recruiter-workspace-nav";
import { useTranslation } from "@/components/language-provider";
import { IntegrationRowStatusBadge } from "@/components/workspace/integration-row-status-badge";
import { WorkspacePilotPageHeader } from "@/components/workspace/workspace-pilot-page-header";
import type { TranslationKey } from "@/lib/i18n";
import { Shell } from "@/components/ui";
import {
  RECRUITER_INTEGRATION_ROWS,
} from "@/lib/recruiter-integrations-readiness";

const LABEL_KEYS: Record<string, TranslationKey> = {
  acceptance_inbox: "recruiterIntegrations.item_acceptance_inbox",
  ats_oauth: "recruiterIntegrations.item_ats_oauth",
  calendar_sync: "recruiterIntegrations.item_calendar_sync",
  teams_meet: "recruiterIntegrations.item_teams_meet",
  greenhouse_webhook: "recruiterIntegrations.item_greenhouse_webhook",
  lever_webhook: "recruiterIntegrations.item_lever_webhook",
};

export default function RecruiterIntegrationsClient() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <RecruiterWorkspaceNav />
      <WorkspacePilotPageHeader
        eyebrowKey="recruiterIntegrations.eyebrow"
        titleKey="recruiterIntegrations.title"
        leadKey="recruiterIntegrations.lead"
        status="pilot"
      />

      <ul className="space-y-3">
        {RECRUITER_INTEGRATION_ROWS.map((row) => {
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

      <p className="twin-muted mt-8 text-xs leading-relaxed">{t("recruiterIntegrations.scopeNote")}</p>
    </Shell>
  );
}
