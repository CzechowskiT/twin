"use client";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { WorkspaceLaneHome } from "@/components/workspace-lane-home";

export default function WorkspaceInvestorPage() {
  return (
    <PersonaWorkspaceGate allowed={["company"]} surface="investor">
      <WorkspaceLaneHome
        title="workspace.investorHomeTitle"
        lead="workspace.investorHomeLead"
        tools={[
          {
            href: "/investor/calculator",
            label: "nav.calculatorInvestor",
            description: "workspace.toolInvestorCalc",
          },
          {
            href: "/for-companies",
            label: "nav.forCompanies",
            description: "workspace.toolInvestorProgram",
          },
          {
            href: "/companies/signup",
            label: "workspace.toolInvestorSignup",
            description: "workspace.toolInvestorSignupDesc",
          },
        ]}
      />
    </PersonaWorkspaceGate>
  );
}
