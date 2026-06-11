"use client";

import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";
import { WorkspaceLaneHome } from "@/components/workspace-lane-home";

export default function WorkspaceInvestorPage() {
  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <WorkspaceLaneHome
        title="workspace.investorHomeTitle"
        lead="workspace.investorHomeLead"
        tools={[
          {
            href: "/investor/data-room",
            label: "investorDataRoom.title",
            description: "workspace.toolInvestorDataRoom",
          },
          {
            href: "/investor/metrics",
            label: "investorMetrics.title",
            description: "workspace.toolInvestorMetrics",
          },
          {
            href: "/investor/placement",
            label: "placementDemo.title",
            description: "workspace.toolInvestorPlacement",
          },
          {
            href: "/investor/roadmap",
            label: "investorRoadmap.title",
            description: "workspace.toolInvestorRoadmap",
          },
          {
            href: "/investor/calculator",
            label: "nav.calculatorInvestor",
            description: "workspace.toolInvestorCalc",
          },
          {
            href: "/investor",
            label: "nav.forInvestors",
            description: "workspace.toolInvestorStory",
          },
        ]}
      />
    </PersonaWorkspaceGate>
  );
}
