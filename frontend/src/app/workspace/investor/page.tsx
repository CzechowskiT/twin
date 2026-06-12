"use client";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { WorkspaceModuleHub } from "@/components/workspace/workspace-module-hub";
import { INVESTOR_WORKSPACE_MODULES } from "@/lib/investor-workspace-modules";

export default function WorkspaceInvestorPage() {
  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <WorkspaceModuleHub
        titleKey="workspaceModules.investorHubTitle"
        leadKey="workspaceModules.investorHubLead"
        modules={INVESTOR_WORKSPACE_MODULES}
        quickActions={[
          { href: "/investor/metrics", labelKey: "workspaceModules.investorMetricsCta" },
          { href: "/investor/roadmap", labelKey: "workspaceModules.investorRoadmapCta" },
          { href: "/investor/data-room", labelKey: "workspaceModules.investorDataRoomCta" },
        ]}
      />
    </PersonaWorkspaceGate>
  );
}
