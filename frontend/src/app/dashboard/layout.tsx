"use client";

import type { ReactNode } from "react";

import { WorkspaceRouteLayout } from "@/components/workspace-route-layout";

/** Candidate dashboard — calendar lives under /dashboard/calendar (candidate-only). */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceRouteLayout allowed={["candidate"]} surface="candidate" withOnboarding>
      {children}
    </WorkspaceRouteLayout>
  );
}
