"use client";

import type { ReactNode } from "react";

import { WorkspaceRouteLayout } from "@/components/workspace-route-layout";

export default function RecruiterLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceRouteLayout allowed={["recruiter", "investor"]} surface="recruiter">
      {children}
    </WorkspaceRouteLayout>
  );
}
