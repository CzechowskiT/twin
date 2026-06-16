"use client";

import dynamic from "next/dynamic";

import { WorkspaceRouteLayout } from "@/components/workspace-route-layout";

const InvestorMetricsRealityDashboard = dynamic(
  () =>
    import("@/components/investor/investor-metrics-reality-dashboard").then(
      (m) => m.InvestorMetricsRealityDashboard,
    ),
  { ssr: false },
);

export default function InvestorMetricsPage() {
  return (
    <WorkspaceRouteLayout allowed={["investor"]} surface="investor">
      <InvestorMetricsRealityDashboard />
    </WorkspaceRouteLayout>
  );
}
