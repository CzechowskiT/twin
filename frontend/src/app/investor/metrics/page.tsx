"use client";

import { InvestorMetricsRealityDashboard } from "@/components/investor/investor-metrics-reality-dashboard";
import { PersonaWorkspaceGate } from "@/components/persona-workspace-gate";

export default function InvestorMetricsPage() {
  return (
    <PersonaWorkspaceGate allowed={["investor"]} surface="investor">
      <InvestorMetricsRealityDashboard />
    </PersonaWorkspaceGate>
  );
}
