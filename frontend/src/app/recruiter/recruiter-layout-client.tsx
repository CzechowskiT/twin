"use client";

import type { ReactNode } from "react";

import { WorkspaceRouteLayout } from "@/components/workspace-route-layout";

export function RecruiterLayoutClient({ children }: { children: ReactNode }) {
  return (
    <WorkspaceRouteLayout allowed={["recruiter", "investor"]} surface="recruiter">
      {children}
    </WorkspaceRouteLayout>
  );
}
