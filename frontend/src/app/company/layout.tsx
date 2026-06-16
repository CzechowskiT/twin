"use client";

import type { ReactNode } from "react";

import { WorkspaceRouteLayout } from "@/components/workspace-route-layout";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceRouteLayout allowed={["company", "recruiter"]} surface="company">
      {children}
    </WorkspaceRouteLayout>
  );
}
