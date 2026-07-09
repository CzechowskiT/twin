"use client";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { InvestorHubNextAction } from "@/components/investor/investor-hub-next-action";
import { SystemOfRecordNavigationHub } from "@/components/workspace/system-of-record-navigation-hub";
import { SHOW_INVESTOR_HUB_NEXT_ACTION } from "@/lib/seven-day-d5-investor";
import { WAVE2B_SLICE4_MAKE_GREEN_MODULE_ID } from "@/lib/all-workspace-green-gate";

export default function WorkspaceInvestorPage() {
  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" data-wave2b-investor-workspace-green={WAVE2B_SLICE4_MAKE_GREEN_MODULE_ID}>
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
