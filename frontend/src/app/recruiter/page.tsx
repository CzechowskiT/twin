"use client";

import { WorkspaceModuleHub } from "@/components/workspace/workspace-module-hub";
import { RECRUITER_WORKSPACE_MODULES } from "@/lib/recruiter-workspace-modules";

/** Canonical recruiter hub — module grid with honest readiness badges. */
export default function RecruiterHubPage() {
  return (
    <WorkspaceModuleHub
      titleKey="workspaceModules.recruiterHubTitle"
      leadKey="workspaceModules.recruiterHubLead"
      modules={RECRUITER_WORKSPACE_MODULES}
      quickActions={[
        { href: "/recruiter/inbox", labelKey: "workspaceModules.recruiterInboxCta" },
        { href: "/recruiter/analytics", labelKey: "workspaceModules.recruiterAnalyticsCta" },
        { href: "/recruiter/integrations", labelKey: "workspaceModules.recruiterIntegrationsCta" },
      ]}
    />
  );
}
