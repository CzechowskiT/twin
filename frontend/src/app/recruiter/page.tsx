"use client";

import Link from "next/link";

import { useTranslation } from "@/components/language-provider";
import { SystemOfRecordNavigationHub } from "@/components/workspace/system-of-record-navigation-hub";
import { WorkspaceQuickActions } from "@/components/workspace/workspace-quick-actions";
import { Shell } from "@/components/ui";

/** Canonical recruiter hub — system-of-record module grid with honest readiness badges. */
export default function RecruiterHubPage() {
  const { t } = useTranslation();

  return (
    <Shell wide>
      <div className="mx-auto max-w-6xl">
        <div className="mt-2">
          <WorkspaceQuickActions
            actions={[
              { href: "/recruiter/inbox", labelKey: "workspaceModules.recruiterInboxCta" },
              { href: "/recruiter/analytics", labelKey: "workspaceModules.recruiterAnalyticsCta" },
              { href: "/recruiter/integrations", labelKey: "workspaceModules.recruiterIntegrationsCta" },
            ]}
          />
        </div>
        <div className="mt-6">
          <SystemOfRecordNavigationHub
            persona="recruiter"
            titleKey="workspaceModules.recruiterHubTitle"
            leadKey="systemOfRecord.recruiterHubLead"
          />
        </div>
        <p className="twin-muted mt-8 text-sm">
          <Link href="/workspace" className="twin-link font-medium">
            {t("workspace.switchContext")}
          </Link>
        </p>
      </div>
    </Shell>
  );
}
