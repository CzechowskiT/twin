"use client";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { SystemOfRecordNavigationHub } from "@/components/workspace/system-of-record-navigation-hub";

export default function WorkspaceInvestorPage() {
  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <SystemOfRecordNavigationHub
          persona="investor"
          titleKey="workspaceModules.investorHubTitle"
          leadKey="systemOfRecord.investorHubLead"
        />
      </div>
    </PersonaWorkspaceGate>
  );
}
