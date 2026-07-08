"use client";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { InvestorHubNextAction } from "@/components/investor/investor-hub-next-action";
import { SystemOfRecordNavigationHub } from "@/components/workspace/system-of-record-navigation-hub";
import { SHOW_INVESTOR_HUB_NEXT_ACTION } from "@/lib/seven-day-d5-investor";

export default function WorkspaceInvestorPage() {
  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {SHOW_INVESTOR_HUB_NEXT_ACTION ? <InvestorHubNextAction /> : null}
        <SystemOfRecordNavigationHub
          persona="investor"
          titleKey="workspaceModules.investorHubTitle"
          leadKey="sevenDayD5.investorWorkspaceHubLead"
        />
      </div>
    </PersonaWorkspaceGate>
  );
}
